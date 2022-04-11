using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using Topshelf;

namespace YWB.IndigoInjector
{
    public class Injector : ServiceControl
    {
        string _curDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
        FileSystemWatcher _watcher;
        public bool Start(HostControl hostControl)
        {
            try
            {
                _watcher = new FileSystemWatcher(Path.GetTempPath());
                Console.WriteLine("Indigo Data Injector v1.0 by Yellow Web (https://yellowweb.top)");
                Console.WriteLine("If you like this software, please, donate!");
                Console.WriteLine("WebMoney: Z182653170916");
                Console.WriteLine("Bitcoin: bc1qqv99jasckntqnk0pkjnrjtpwu0yurm0qd0gnqv");
                Console.WriteLine("Ethereum: 0xBC118D3FDE78eE393A154C29A4545c575506ad6B");

                _watcher.NotifyFilter = NotifyFilters.Attributes
                                     | NotifyFilters.CreationTime
                                     | NotifyFilters.DirectoryName
                                     | NotifyFilters.FileName
                                     | NotifyFilters.LastAccess
                                     | NotifyFilters.LastWrite
                                     | NotifyFilters.Security
                                     | NotifyFilters.Size;
                _watcher.Created += OnCreated;
                _watcher.IncludeSubdirectories = true;
                _watcher.EnableRaisingEvents = true;
            }
            catch (Exception ex)
            {
                File.WriteAllText(Path.Combine(Path.GetTempPath(), "YWB.IndigoInjector.log"), ex.ToString());
                return false;
            }

            Console.WriteLine("Listening for new Indigo Profiles launching");
            return true;
        }

        public bool Stop(HostControl hostControl)
        {
            _watcher.EnableRaisingEvents = false;
            _watcher.Dispose();
            return true;
        }

        void OnCreated(object sender, FileSystemEventArgs e)
        {
            if (Regex.IsMatch(e.Name, @"^MLA\.\d+\\Default$") && e.ChangeType == WatcherChangeTypes.Created)
            {
                InstallBookmarks(e);
            }
            else if (Regex.IsMatch(e.FullPath, @"MLA\.\d+\\popup_menu\.html$") && e.ChangeType == WatcherChangeTypes.Created)
            {
                InstallExtension(e);
            }
        }

        void InstallBookmarks(FileSystemEventArgs e)
        {
            File.Copy(Path.Combine(_curDir, "Data", "Bookmarks"), Path.Combine(e.FullPath, "Bookmarks"), true);
            Console.WriteLine("Added Bookmarks for Indigo's browser profile!");
        }

        void InstallExtension(FileSystemEventArgs e)
        {
            var extensionDir = Path.GetDirectoryName(e.FullPath);
            Directory.GetFiles(Path.Combine(_curDir, "Data", "Extension")).ToList().ForEach(f => File.Copy(f, Path.Combine(extensionDir, Path.GetFileName(f)), true));
            Console.WriteLine("Added MaskFB Extension for Indigo's browser profile!");
        }
    }
}
