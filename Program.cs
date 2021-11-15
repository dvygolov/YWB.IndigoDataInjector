using System;
using Topshelf;

namespace YWB.IndigoInjector
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.InputEncoding = System.Text.Encoding.UTF8;
            Console.OutputEncoding = System.Text.Encoding.UTF8;
            HostFactory.Run(x =>
            {
                x.Service<Injector>(s =>
                {
                    s.ConstructUsing(name => new Injector());
                    s.WhenStarted(inj => inj.Start());
                    s.WhenStopped(inj => inj.Stop());
                });
                x.RunAsLocalSystem();

                x.SetDescription("Indigo Bookmarks and Extension modifier by Yellow Web");
                x.SetDisplayName("YWB.IndigoDataInjector");
                x.SetServiceName("YWB.IndigoDataInjector");
            });

        }

    }
}
