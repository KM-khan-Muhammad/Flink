using System.Threading.Tasks;

namespace Flink.Application.Interfaces
{
    public interface ISmsService
    {
        Task SendSmsAsync(string toPhoneNumber, string message);
        Task SendWhatsAppAsync(string toPhoneNumber, string message);
    }
}
