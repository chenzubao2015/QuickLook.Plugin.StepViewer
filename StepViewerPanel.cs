using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using QuickLook.Common.Helpers;
using QuickLook.Common.Plugin;
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Windows.Controls;

namespace QuickLook.Plugin.StepViewer
{
    internal sealed class StepViewerPanel : UserControl, IDisposable
    {
        private const string ViewerHost = "stepviewer.local";
        private const string ModelHost = "stepmodel.local";
        private readonly ContextObject _context;
        private readonly string _modelPath;
        private readonly string _webRoot;
        private WebView2 _webView;
        private bool _modelLoadStarted;

        public StepViewerPanel(string modelPath, ContextObject context)
        {
            _modelPath = modelPath;
            _context = context;
            _webRoot = Path.Combine(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location), "Web");

            _webView = new WebView2
            {
                CreationProperties = new CoreWebView2CreationProperties
                {
                    UserDataFolder = Path.Combine(SettingHelper.LocalDataPath, "WebView2_Data")
                },
                DefaultBackgroundColor = Color.FromArgb(255, 245, 247, 250)
            };

            Content = _webView;
            Loaded += OnLoaded;
        }

        private async void OnLoaded(object sender, System.Windows.RoutedEventArgs e)
        {
            Loaded -= OnLoaded;
            try
            {
                if (!Directory.Exists(_webRoot))
                    throw new DirectoryNotFoundException("StepViewer Web resources are missing.");

                string modelDirectory = Path.GetDirectoryName(_modelPath);
                if (string.IsNullOrEmpty(modelDirectory) || !Directory.Exists(modelDirectory))
                    throw new DirectoryNotFoundException("The CAD file directory is unavailable.");

                await _webView.EnsureCoreWebView2Async();
                _webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    ViewerHost, _webRoot, CoreWebView2HostResourceAccessKind.DenyCors);
                _webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    ModelHost, modelDirectory, CoreWebView2HostResourceAccessKind.Allow);
                _webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
                _webView.CoreWebView2.NavigationCompleted += OnNavigationCompleted;
                _webView.CoreWebView2.ProcessFailed += OnProcessFailed;
                _webView.CoreWebView2.NewWindowRequested += OnNewWindowRequested;
                _webView.Source = new Uri("https://" + ViewerHost + "/index.html?v=" + DateTime.UtcNow.Ticks);
            }
            catch (Exception ex)
            {
                ShowError(ex.Message);
            }
        }

        private void OnNavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
        {
            if (!e.IsSuccess)
                ShowError("Viewer page failed to load: " + e.WebErrorStatus);
        }

        private void OnProcessFailed(object sender, CoreWebView2ProcessFailedEventArgs e)
        {
            ShowError("WebView2 process failed: " + e.ProcessFailedKind);
        }

        private void OnNewWindowRequested(object sender, CoreWebView2NewWindowRequestedEventArgs e)
        {
            e.Handled = true;
            if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out var uri) ||
                !uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ||
                !uri.Host.Equals("github.com", StringComparison.OrdinalIgnoreCase))
                return;

            try
            {
                Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                ProcessHelper.WriteLog("StepViewer link error: " + ex.Message);
            }
        }

        private async void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            string message = e.TryGetWebMessageAsString();
            ProcessHelper.WriteLog("StepViewer: " + message);

            if (message == "ready" && !_modelLoadStarted)
            {
                _modelLoadStarted = true;
                try
                {
                    string modelUrl = "https://" + ModelHost + "/" + Uri.EscapeDataString(Path.GetFileName(_modelPath));
                    await _webView.ExecuteScriptAsync(
                        "window.loadCadFromUrl(" + JsString(modelUrl) + ", " +
                        JsString(Path.GetFileName(_modelPath)) + ", " +
                        JsString(Path.GetExtension(_modelPath).ToLowerInvariant()) + ");");
                }
                catch (Exception ex)
                {
                    ShowError(ex.Message);
                }
            }
        }

        private void ShowError(string message)
        {
            ProcessHelper.WriteLog("StepViewer error: " + message);
            _context.IsBusy = false;
            Content = new TextBlock
            {
                Text = "CAD preview failed.\n\n" + message +
                       "\n\nMake sure Microsoft Edge WebView2 Runtime is installed.",
                Margin = new System.Windows.Thickness(32),
                TextWrapping = System.Windows.TextWrapping.Wrap,
                VerticalAlignment = System.Windows.VerticalAlignment.Center,
                HorizontalAlignment = System.Windows.HorizontalAlignment.Center
            };
        }

        private static string JsString(string value)
        {
            return "\"" + value
                .Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\r", "\\r")
                .Replace("\n", "\\n") + "\"";
        }

        public void Dispose()
        {
            Loaded -= OnLoaded;
            if (_webView != null)
            {
                if (_webView.CoreWebView2 != null)
                {
                    _webView.CoreWebView2.WebMessageReceived -= OnWebMessageReceived;
                    _webView.CoreWebView2.NavigationCompleted -= OnNavigationCompleted;
                    _webView.CoreWebView2.ProcessFailed -= OnProcessFailed;
                    _webView.CoreWebView2.NewWindowRequested -= OnNewWindowRequested;
                    _webView.CoreWebView2.ClearVirtualHostNameToFolderMapping(ViewerHost);
                    _webView.CoreWebView2.ClearVirtualHostNameToFolderMapping(ModelHost);
                }
                _webView.Dispose();
                _webView = null;
            }
        }
    }
}
