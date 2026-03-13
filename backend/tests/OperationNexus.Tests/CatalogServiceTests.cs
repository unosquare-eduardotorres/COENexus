using System.Net;
using System.Text;
using Microsoft.Extensions.Options;
using OperationNexus.Api.Configuration;
using OperationNexus.Api.Services;
using Xunit;

namespace OperationNexus.Tests;

public class CatalogServiceTests
{
    private const string FakeToken = "fake-token";
    private const string BaseUrl = "https://test-api.example.com/corecatalogs/api/";

    private static CatalogService CreateService(MockHttpMessageHandler handler)
    {
        var httpClient = new HttpClient(handler);
        var settings = Options.Create(new CatalogSettings { ApiUrl = BaseUrl });
        return new CatalogService(httpClient, settings);
    }

    [Fact]
    public async Task GetSenioritiesAsync_DeserializesKeyTextFormat()
    {
        var handler = new MockHttpMessageHandler("""[{"key":3,"text":"Intermediate"},{"key":7,"text":"Principal"}]""");
        var service = CreateService(handler);

        var result = await service.GetSenioritiesAsync(FakeToken);

        Assert.Equal(2, result.Count);
        Assert.Equal("Intermediate", result[3]);
        Assert.Equal("Principal", result[7]);
    }

    [Fact]
    public async Task GetCountriesAsync_DeserializesValueLabelFormat()
    {
        var handler = new MockHttpMessageHandler("""[{"value":1,"label":"Argentina","tagValue":"AR"},{"value":3,"label":"Mexico","tagValue":"MX"}]""");
        var service = CreateService(handler);

        var result = await service.GetCountriesAsync(FakeToken);

        Assert.Equal(2, result.Count);
        Assert.Equal("Argentina", result[1]);
        Assert.Equal("Mexico", result[3]);
    }

    [Fact]
    public async Task GetMainSkillsAsync_DeserializesValueLabelFormat()
    {
        var handler = new MockHttpMessageHandler("""[{"value":700,"label":"3D Artist"},{"value":701,"label":"React"}]""");
        var service = CreateService(handler);

        var result = await service.GetMainSkillsAsync(FakeToken);

        Assert.Equal(2, result.Count);
        Assert.Equal("3D Artist", result[700]);
        Assert.Equal("React", result[701]);
    }

    [Fact]
    public async Task GetSenioritiesAsync_SetsAuthorizationHeader()
    {
        var handler = new MockHttpMessageHandler("[]");
        var service = CreateService(handler);

        await service.GetSenioritiesAsync(FakeToken);

        Assert.NotNull(handler.LastRequest);
        Assert.True(handler.LastRequest!.Headers.Contains("x-sharepoint-token"));
        Assert.Equal(FakeToken, handler.LastRequest.Headers.GetValues("x-sharepoint-token").First());
    }

    [Fact]
    public async Task GetSenioritiesAsync_CachesResult()
    {
        var handler = new MockHttpMessageHandler("""[{"key":1,"text":"Junior"}]""");
        var service = CreateService(handler);

        var first = await service.GetSenioritiesAsync(FakeToken);
        var second = await service.GetSenioritiesAsync(FakeToken);

        Assert.Same(first, second);
        Assert.Equal(1, handler.RequestCount);
    }

    [Fact]
    public async Task GetCountriesAsync_UsesCorrectEndpoint()
    {
        var handler = new MockHttpMessageHandler("[]");
        var service = CreateService(handler);

        await service.GetCountriesAsync(FakeToken);

        Assert.NotNull(handler.LastRequest);
        Assert.Equal($"{BaseUrl}locations/countries/true", handler.LastRequest!.RequestUri!.ToString());
    }

    [Fact]
    public async Task GetMainSkillsAsync_UsesCorrectEndpoint()
    {
        var handler = new MockHttpMessageHandler("[]");
        var service = CreateService(handler);

        await service.GetMainSkillsAsync(FakeToken);

        Assert.NotNull(handler.LastRequest);
        Assert.Equal($"{BaseUrl}main-skills", handler.LastRequest!.RequestUri!.ToString());
    }
}

public class MockHttpMessageHandler : HttpMessageHandler
{
    private readonly string _responseContent;
    private readonly HttpStatusCode _statusCode;

    public HttpRequestMessage? LastRequest { get; private set; }
    public int RequestCount { get; private set; }

    public MockHttpMessageHandler(string responseContent, HttpStatusCode statusCode = HttpStatusCode.OK)
    {
        _responseContent = responseContent;
        _statusCode = statusCode;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        LastRequest = request;
        RequestCount++;

        return Task.FromResult(new HttpResponseMessage(_statusCode)
        {
            Content = new StringContent(_responseContent, Encoding.UTF8, "application/json")
        });
    }
}
