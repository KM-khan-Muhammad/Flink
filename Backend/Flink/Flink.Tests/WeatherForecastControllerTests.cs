using Flink.web;
using Flink.web.Controllers;
using Microsoft.AspNetCore.Mvc;

namespace Flink.Tests;

public class WeatherForecastControllerTests
{
    [Fact]
    public void Get_ReturnsFiveForecasts()
    {
        var controller = new WeatherForecastController();

        var result = controller.Get();

        var forecasts = Assert.IsAssignableFrom<IEnumerable<WeatherForecast>>(result);
        Assert.Equal(5, forecasts.Count());
    }

    [Fact]
    public void Get_AllForecastsHaveValidTemperatures()
    {
        var controller = new WeatherForecastController();

        var result = controller.Get();

        foreach (var forecast in result)
        {
            Assert.InRange(forecast.TemperatureC, -20, 55);
            Assert.NotNull(forecast.Summary);
        }
    }
}
