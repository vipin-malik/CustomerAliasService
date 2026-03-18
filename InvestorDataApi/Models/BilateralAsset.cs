using System.ComponentModel.DataAnnotations.Schema;

namespace InvestorDataApi.Models;

[Table("bilateral_asset_level")]
public class BilateralAsset
{
    [Column("id")]
    public int Id { get; set; }

    [Column("As of Date")]
    public DateTime? AsOfDate { get; set; }

    [Column("CIS Code")]
    public string? CisCode { get; set; }

    [Column("Data Context")]
    public string? DataContext { get; set; }

    [Column("Included in Pool")]
    public bool? IncludedInPool { get; set; }

    [Column("NatWest Unique Id")]
    public string? NatWestUniqueId { get; set; }

    [Column("Obligor Name")]
    public string? ObligorName { get; set; }

    [Column("Tranche")]
    public string? Tranche { get; set; }

    [Column("Loan Type")]
    public string? LoanType { get; set; }

    [Column("Seniority")]
    public string? Seniority { get; set; }

    [Column("Native Currency")]
    public string? NativeCurrency { get; set; }

    [Column("FX")]
    public decimal? Fx { get; set; }

    [Column("Notional Funded (Native Currency)")]
    public decimal? NotionalFundedNative { get; set; }

    [Column("Notional Funded (Deal Base Currency)")]
    public decimal? NotionalFundedDealBase { get; set; }

    [Column("Post haircut (Deal Base Currency)")]
    public decimal? PostHaircutDealBase { get; set; }

    [Column("Country Reported")]
    public string? CountryReported { get; set; }

    [Column("NWM Standard Country Name")]
    public string? NwmCountryName { get; set; }

    [Column("NWM Standard Industry Group")]
    public string? NwmIndustryGroup { get; set; }

    [Column("Cyclicality Profile")]
    public string? CyclicalityProfile { get; set; }

    [Column("Industry Sectors Reported")]
    public string? IndustrySectorsReported { get; set; }

    [Column("NWM Industry Sub Sectors")]
    public string? NwmIndustrySubSectors { get; set; }

    [Column("Curr Issuer Rating -Moodys")]
    public string? RatingMoodys { get; set; }

    [Column("Curr Issuer Rating -S&P")]
    public string? RatingSP { get; set; }

    [Column("Curr Issuer Rating -Fitch")]
    public string? RatingFitch { get; set; }

    [Column("Curr Issuer Rating -KBRA")]
    public string? RatingKBRA { get; set; }

    [Column("Curr Issuer Rating -DBRS")]
    public string? RatingDBRS { get; set; }

    [Column("NWM Watchlist Status")]
    public string? WatchlistStatus { get; set; }

    [Column("Maturity Date")]
    public DateTime? MaturityDate { get; set; }

    [Column("EV/EBITDA")]
    public decimal? EvEbitda { get; set; }

    [Column("LTV (%)")]
    public decimal? Ltv { get; set; }

    [Column("Total Margin")]
    public decimal? TotalMargin { get; set; }

    [Column("Cash Margin")]
    public decimal? CashMargin { get; set; }

    [Column("PIK Status")]
    public string? PikStatus { get; set; }

    [Column("Last Updated at")]
    public DateTime? LastUpdatedAt { get; set; }

    [Column("Last Updated by")]
    public string? LastUpdatedBy { get; set; }
}
