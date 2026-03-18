using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InvestorDataApi.Models;

[Table("CustomerMaster", Schema = "InvestorAlias")]
public class CustomerMaster
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    [Column("CanonicalCustomerId")]
    public int CanonicalCustomerId { get; set; }

    [MaxLength(500)]
    [Column("CanonicalCustomerName")]
    public string? CanonicalCustomerName { get; set; }

    [MaxLength(50)]
    [Column("CIS CODE")]
    public string? CisCode { get; set; }

    [MaxLength(200)]
    [Column("Ctry Of Op")]
    public string? CountryOfOperation { get; set; }

    [MaxLength(100)]
    [Column("MGS")]
    public string? Mgs { get; set; }

    [MaxLength(200)]
    [Column("Ctry of Inc")]
    public string? CountryOfIncorporation { get; set; }

    [MaxLength(200)]
    [Column("Region")]
    public string? Region { get; set; }

    public ICollection<CustomerAliasMapping>? AliasMappings { get; set; }
}
