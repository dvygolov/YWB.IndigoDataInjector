using System;
using System.IO;
using Topshelf;

namespace YWB.IndigoInjector
{
    class Program
    {
        static void Main(string[] args)
        {
            try
            {
                var serviceRunner = HostFactory.Run(x =>
                  {
                      x.SetStartTimeout(TimeSpan.FromSeconds(30));
                      x.Service(s => new Injector());
                      x.OnException(ex =>
                      {
                          File.WriteAllText(Path.Combine(Path.GetTempPath(), "YWB.IndigoInjector.log"), ex.ToString());
                      });
                      x.RunAsLocalSystem();
                      x.StartAutomatically();
                      x.SetDescription("Indigo Bookmarks and Extension modifier by Yellow Web");
                      x.SetDisplayName("YWB.IndigoDataInjector");
                      x.SetServiceName("YWB.IndigoDataInjector");
                  });
                var exitCode = (int)Convert.ChangeType(serviceRunner, serviceRunner.GetTypeCode());
                Environment.ExitCode = exitCode;
            }
            catch (Exception e)
            {
                File.WriteAllText(Path.Combine(Path.GetTempPath(), "YWB.IndigoInjector.log"), e.ToString());
            }
        }
    }
}
