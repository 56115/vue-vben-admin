import { requestClient } from '#/api/request';

import type { AiProviderKey, ModelPreset } from './ProviderPresets';

export type CredentialScope = 'platform' | 'tenant';

export type CredentialTestStatus =
  | 'AUTH_FAILED'
  | 'MODEL_NOT_SUPPORTED'
  | 'NETWORK_ERROR'
  | 'OK'
  | 'TIMEOUT'
  | 'UNKNOWN'
  | 'UNKNOWN_ERROR';

export interface CredentialTestResult {
  message?: string;
  status: CredentialTestStatus;
  testedAt?: string;
}

type CredentialTestResponse = CredentialTestResult | CredentialTestStatus;

export interface AiCredentialDto {
  apiKeyHint: string;
  baseUrl: string;
  displayName: string;
  enabledModels: ModelPreset[];
  id: number;
  isActive: boolean;
  lastTestStatus?: CredentialTestStatus | null;
  lastTestedAt?: string | null;
  provider: AiProviderKey;
}

export interface AiCredentialUpsertDto {
  apiKey?: string;
  baseUrl: string;
  displayName: string;
  enabledModels: ModelPreset[];
  isActive?: boolean;
  provider: AiProviderKey;
}

function basePath(scope: CredentialScope): string {
  return scope === 'platform'
    ? '/platform/ai-credentials'
    : '/settings/ai-credentials';
}

function configPath(scope: CredentialScope): string {
  return scope === 'platform' ? '/platform/ai-config' : '/settings/ai-config';
}

function splitCompositeModel(
  value?: null | string,
): null | { credentialId: number; modelName: string } {
  if (!value) return null;
  const [credentialId, ...modelParts] = value.split(':');
  const id = Number(credentialId);
  const modelName = modelParts.join(':');
  if (!Number.isFinite(id) || !modelName) return null;
  return { credentialId: id, modelName };
}

function toCompositeModel(
  binding?: DefaultModelBindingDto | ScenarioBindingDto,
): string | undefined {
  if (!binding?.credentialId || !binding.modelName) return undefined;
  return `${binding.credentialId}:${binding.modelName}`;
}

export function listCredentials(scope: CredentialScope) {
  return requestClient.get<AiCredentialDto[]>(basePath(scope));
}

export function createCredential(
  scope: CredentialScope,
  dto: AiCredentialUpsertDto,
) {
  return requestClient.post<AiCredentialDto>(basePath(scope), dto);
}

export function updateCredential(
  scope: CredentialScope,
  id: number,
  dto: AiCredentialUpsertDto,
) {
  return requestClient.put<AiCredentialDto>(`${basePath(scope)}/${id}`, dto);
}

export function deleteCredential(scope: CredentialScope, id: number) {
  return requestClient.delete<void>(`${basePath(scope)}/${id}`);
}

function normalizeCredentialTestResult(
  result: CredentialTestResponse,
): CredentialTestResult {
  return typeof result === 'string' ? { status: result } : result;
}

export async function testCredential(scope: CredentialScope, id: number) {
  const result = await requestClient.post<CredentialTestResponse>(
    `${basePath(scope)}/${id}/test`,
  );
  return normalizeCredentialTestResult(result);
}

// Default-model bindings
export interface DefaultModelBindingDto {
  capability: 'EMBEDDING' | 'LLM' | 'VISION';
  credentialId: number;
  modelName: string;
}

interface TenantAiConfigResponse {
  config?: {
    defaultEmbedding?: null | string;
    defaultLlm?: null | string;
    defaultVision?: null | string;
  } | null;
  scenarios?: ScenarioConfigRow[];
}

interface ScenarioConfigRow {
  maxTokens?: null | number;
  modelName?: null | string;
  scenario: string;
  temperature?: null | number;
  timeout?: null | number;
  topP?: null | number;
}

const platformDefaultScenarioByCapability: Record<
  DefaultModelBindingDto['capability'],
  string
> = {
  LLM: 'LLM_CHAT',
  VISION: 'VISION_OCR',
  EMBEDDING: 'EMBEDDING',
};

export async function getDefaultModels(scope: CredentialScope) {
  if (scope === 'tenant') {
    const res = await requestClient.get<TenantAiConfigResponse>(
      configPath(scope),
    );
    const config = res.config;
    const pairs: Array<
      [DefaultModelBindingDto['capability'], null | string | undefined]
    > = [
      ['LLM', config?.defaultLlm],
      ['VISION', config?.defaultVision],
      ['EMBEDDING', config?.defaultEmbedding],
    ];
    return pairs.flatMap(([capability, value]) => {
      const model = splitCompositeModel(value);
      return model ? [{ capability, ...model }] : [];
    });
  }

  const scenarios = await requestClient.get<ScenarioConfigRow[]>(
    `${configPath(scope)}/scenarios`,
  );
  return Object.entries(platformDefaultScenarioByCapability).flatMap(
    ([capability, scenario]) => {
      const row = scenarios.find((item) => item.scenario === scenario);
      const model = splitCompositeModel(row?.modelName);
      return model
        ? [
            {
              capability: capability as DefaultModelBindingDto['capability'],
              ...model,
            },
          ]
        : [];
    },
  );
}

export async function setDefaultModels(
  scope: CredentialScope,
  dto: DefaultModelBindingDto[],
) {
  if (scope === 'tenant') {
    const byCapability = Object.fromEntries(
      dto.map((item) => [item.capability, item]),
    );
    await requestClient.put(`${configPath(scope)}/defaults`, {
      defaultLlm: toCompositeModel(byCapability.LLM),
      defaultVision: toCompositeModel(byCapability.VISION),
      defaultEmbedding: toCompositeModel(byCapability.EMBEDDING),
    });
    return dto;
  }

  await Promise.all(
    dto.map((item) => {
      const scenario = platformDefaultScenarioByCapability[item.capability];
      return requestClient.put(`${configPath(scope)}/scenarios/${scenario}`, {
        modelName: toCompositeModel(item),
      });
    }),
  );
  return dto;
}

// Scenario bindings
export interface ScenarioBindingDto {
  credentialId: number;
  maxTokens?: null | number;
  modelName: string;
  scenario: string;
  temperature?: null | number;
  timeout?: null | number;
  topP?: null | number;
}

export async function getScenarioBindings(scope: CredentialScope) {
  const rows =
    scope === 'tenant'
      ? (await requestClient.get<TenantAiConfigResponse>(configPath(scope)))
          .scenarios || []
      : await requestClient.get<ScenarioConfigRow[]>(
          `${configPath(scope)}/scenarios`,
        );

  return rows.flatMap((row) => {
    const model = splitCompositeModel(row.modelName);
    return model
      ? [
          {
            scenario: row.scenario,
            ...model,
            temperature: row.temperature,
            maxTokens: row.maxTokens,
            timeout: row.timeout,
            topP: row.topP,
          },
        ]
      : [];
  });
}

export async function setScenarioBindings(
  scope: CredentialScope,
  dto: ScenarioBindingDto[],
) {
  await Promise.all(
    dto.map((item) =>
      requestClient.put(`${configPath(scope)}/scenarios/${item.scenario}`, {
        modelName: toCompositeModel(item),
      }),
    ),
  );
  return dto;
}
