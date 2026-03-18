namespace InvestorDataApi.Models;

public class InvestorDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? AssetClass { get; set; }
    public string? Source { get; set; }
    public string? CisCode { get; set; }
    public string? NatwestId { get; set; }
    public string? Tranche { get; set; }
    public string? Seniority { get; set; }
    public string? Currency { get; set; }
    public decimal? Fx { get; set; }
    public string? Country { get; set; }
    public string? Industry { get; set; }
    public DateTime? CreatedAt { get; set; }
}
