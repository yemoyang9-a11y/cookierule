// Cookierule build-time configuration. Same shape as Headrule's config so the
// license module can be shared unchanged. Nothing here is secret.
export const CONFIG = {
  productName: "Cookierule",
  version: "0.1.0",
  siteUrl: "https://yemoyang9-a11y.github.io/cookierule/",
  buyUrl: "https://headrule.lemonsqueezy.com",
  supportEmail: "support@headrule.com",
  lemonSqueezy: {
    apiBase: "https://api.lemonsqueezy.com/v1/licenses",
    // Fill in after creating the Cookierule product (see HANDOVER.md).
    storeId: 0,
    productId: 0
  },
  // Free tier: everything needed to inspect, edit, protect, import and export
  // cookies on one machine. Pro only adds convenience (profiles, sync, bulk).
  free: {
    allowProfiles: false,
    allowSync: false,
    allowNetscapeExport: false,
    allowAllSitesBulk: false
  },
  licenseRecheckDays: 7,
  licenseOfflineGraceDays: 30
};
