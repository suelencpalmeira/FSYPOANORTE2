using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;

class FsyServer
{
    static int Main()
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        const int port = 8765;
        string prefix = "http://127.0.0.1:" + port + "/";
        HttpListener listener = new HttpListener();
        listener.Prefixes.Add(prefix);
        listener.Prefixes.Add("http://localhost:" + port + "/");
        try
        {
            listener.Start();
        }
        catch (Exception ex)
        {
            Console.WriteLine("Nao foi possivel abrir a porta " + port + ".");
            Console.WriteLine(ex.Message);
            Console.WriteLine("Feche outra janela do FSY e tente de novo.");
            Console.WriteLine("Pressione Enter para sair.");
            Console.ReadLine();
            return 1;
        }

        Console.WriteLine("FSY 2027 no ar em " + prefix);
        Console.WriteLine("Nao feche esta janela. O login com Gmail precisa dela aberta.");
        try
        {
            Process.Start(new ProcessStartInfo { FileName = prefix, UseShellExecute = true });
        }
        catch { }

        while (listener.IsListening)
        {
            HttpListenerContext ctx = null;
            try
            {
                ctx = listener.GetContext();
                string rel = Uri.UnescapeDataString(ctx.Request.Url.AbsolutePath.TrimStart('/').Replace('/', '\\'));
                if (string.IsNullOrWhiteSpace(rel)) rel = "index.html";
                string full = Path.GetFullPath(Path.Combine(root, rel));
                string rootFull = Path.GetFullPath(root);
                if (!full.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase))
                {
                    ctx.Response.StatusCode = 403;
                    ctx.Response.Close();
                    continue;
                }
                if (!File.Exists(full))
                {
                    ctx.Response.StatusCode = 404;
                    byte[] missing = Encoding.UTF8.GetBytes("Arquivo nao encontrado");
                    ctx.Response.OutputStream.Write(missing, 0, missing.Length);
                    ctx.Response.Close();
                    continue;
                }
                string ext = Path.GetExtension(full).ToLowerInvariant();
                string mime = "application/octet-stream";
                if (ext == ".html") mime = "text/html; charset=utf-8";
                else if (ext == ".css") mime = "text/css; charset=utf-8";
                else if (ext == ".js") mime = "text/javascript; charset=utf-8";
                else if (ext == ".csv") mime = "text/csv; charset=utf-8";
                else if (ext == ".svg") mime = "image/svg+xml";
                else if (ext == ".png") mime = "image/png";
                else if (ext == ".ico") mime = "image/x-icon";
                byte[] bytes = File.ReadAllBytes(full);
                ctx.Response.Headers["Cache-Control"] = "no-cache";
                ctx.Response.ContentType = mime;
                ctx.Response.ContentLength64 = bytes.Length;
                ctx.Response.OutputStream.Write(bytes, 0, bytes.Length);
                ctx.Response.Close();
            }
            catch
            {
                try { if (ctx != null) ctx.Response.Close(); } catch { }
            }
        }
        return 0;
    }
}
