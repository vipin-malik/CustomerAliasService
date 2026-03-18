using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InvestorDataApi.Models;

[Table("CustomerAliasMapping", Schema = "InvestorAlias")]
public class CustomerAliasMapping
{
    [Key]
    [Column("ID")]
    public int Id { get; set; }

    [Required]
    [MaxLength(1000)]
    [Column("OriginalCustomerName")]
    public string OriginalCustomerName { get; set; } = string.Empty;

    [MaxLength(500)]
    [Column("CleanedCustomerName")]
    public string? CleanedCustomerName { get; set; }

    [Column("CanonicalCustomerId")]
    public int? CanonicalCustomerId { get; set; }

    [ForeignKey("CanonicalCustomerId")]
    public CustomerMaster? CustomerMaster { get; set; }
}
