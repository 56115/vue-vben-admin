import { requestClient } from '#/api/request';

export interface BrandingSetting {
  id?: string;
  systemName?: string | null;
  logoUrl?: string | null;
  logoInvertedUrl?: string | null;
  companyName?: string | null;
  companyShortName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
}

export async function getBrandingApi(): Promise<BrandingSetting | null> {
  return requestClient.get('/settings/branding');
}

export async function updateBrandingApi(
  data: Partial<BrandingSetting>,
): Promise<BrandingSetting> {
  return requestClient.put('/settings/branding', data);
}
