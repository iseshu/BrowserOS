import {
  CheckCircle2,
  Cpu,
  Globe,
  Loader2,
  RotateCcw,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react'
import type { FC } from 'react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  testDecisionProvider,
  type DecisionTestResult,
} from '@/lib/llm-providers/testDecisionProvider'
import type { DecisionProviderConfig } from '@/lib/llm-providers/types'
import { useAgentServerUrl } from '@/modules/browseros/agent-server-url.hooks'

const STORAGE_KEY = 'browseros.decision_config'

const PRESETS = {
  custom: {
    name: 'Custom Decision API',
    baseUrl: 'https://api.typesafe.ai/v1/systemone',
    modelId: 'clef-flash-9b',
  },
  jev: {
    name: 'TypeSafe Jev',
    baseUrl: 'https://api.typesafe.ai/v1/systemone',
    modelId: 'typesafe/jev-latest',
  },
  'cloudflare-clef': {
    name: 'Cloudflare Clef-flash',
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{{account_id}}/ai/run/@cf/cloudflare/clef-flash-9b',
    modelId: 'cloudflare/clef-flash-9b',
  },
} as const

export const DecisionSettingsPage: FC = () => {
  const { baseUrl: resolvedAgentUrl } = useAgentServerUrl()
  const agentServerUrl = resolvedAgentUrl || 'http://127.0.0.1:9100'

  const [config, setConfig] = useState<DecisionProviderConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // If an old local mock URL was saved in storage, sanitize it to cloudflare
        if (parsed.baseUrl && (parsed.baseUrl.includes('127.0.0.1:4000') || parsed.baseUrl.includes('localhost:4000')) && parsed.type !== 'custom') {
          parsed.baseUrl = PRESETS['cloudflare-clef'].baseUrl
          parsed.type = 'cloudflare-clef'
        }
        return parsed
      }
    } catch {
      // ignore
    }
    return {
      enabled: true,
      id: 'default-decision',
      type: 'cloudflare-clef',
      name: 'Cloudflare Clef-flash',
      baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{{account_id}}/ai/run/@cf/cloudflare/clef-flash-9b',
      modelId: 'cloudflare/clef-flash-9b',
      apiKey: '',
      headers: {},
      confidenceThreshold: 0.8,
      cacheEnabled: true,
      batchingEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  })

  const [cfAccountId, setCfAccountId] = useState(() => {
    const match = config.baseUrl?.match(/accounts\/([a-zA-Z0-9_-]+)\//)
    return match && match[1] !== '{{account_id}}' ? match[1] : ''
  })

  const [headersText, setHeadersText] = useState(() =>
    JSON.stringify(config.headers || {}, null, 2),
  )
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<DecisionTestResult | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Compute effective target URL based on active preset and parameters
  const getEffectiveUrl = () => {
    if (config.type === 'cloudflare-clef') {
      const cleanId = cfAccountId.trim()
      return `https://api.cloudflare.com/client/v4/accounts/${cleanId || '{{account_id}}'}/ai/run/@cf/cloudflare/clef-flash-9b`
    }
    if (config.type === 'jev') {
      return PRESETS.jev.baseUrl
    }
    return config.baseUrl || PRESETS.custom.baseUrl
  }

  const effectiveUrl = getEffectiveUrl()

  const handlePresetChange = (preset: 'custom' | 'jev' | 'cloudflare-clef') => {
    const selected = PRESETS[preset]
    let targetBaseUrl = selected.baseUrl
    if (preset === 'cloudflare-clef') {
      const cleanId = cfAccountId.trim()
      targetBaseUrl = `https://api.cloudflare.com/client/v4/accounts/${cleanId || '{{account_id}}'}/ai/run/@cf/cloudflare/clef-flash-9b`
    } else if (preset === 'jev') {
      targetBaseUrl = PRESETS.jev.baseUrl
    }

    setConfig((prev) => ({
      ...prev,
      type: preset,
      name: selected.name,
      baseUrl: targetBaseUrl,
      modelId: selected.modelId,
    }))
    setTestResult(null)
  }

  const handleAccountIdChange = (id: string) => {
    const clean = id.trim()
    setCfAccountId(clean)
    const newUrl = `https://api.cloudflare.com/client/v4/accounts/${clean || '{{account_id}}'}/ai/run/@cf/cloudflare/clef-flash-9b`
    setConfig((prev) => ({
      ...prev,
      baseUrl: newUrl,
    }))
  }

  const handleResetToDefaults = () => {
    const selected = PRESETS[config.type as keyof typeof PRESETS] || PRESETS['cloudflare-clef']
    let targetBaseUrl = selected.baseUrl
    if (config.type === 'cloudflare-clef' && cfAccountId.trim()) {
      targetBaseUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId.trim()}/ai/run/@cf/cloudflare/clef-flash-9b`
    }
    setConfig((prev) => ({
      ...prev,
      baseUrl: targetBaseUrl,
      modelId: selected.modelId,
      name: selected.name,
    }))
    setTestResult(null)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)

    const targetUrl = getEffectiveUrl()

    // Validate Cloudflare Account ID and API Token
    if (config.type === 'cloudflare-clef') {
      if (!cfAccountId.trim() || targetUrl.includes('{{account_id}}')) {
        setTestResult({
          success: false,
          message: 'Please enter your 32-character Cloudflare Account ID before testing.',
        })
        setTesting(false)
        return
      }
      if (!config.apiKey?.trim()) {
        setTestResult({
          success: false,
          message: 'Please enter your Cloudflare Workers AI API Token before testing.',
        })
        setTesting(false)
        return
      }
    } else if (config.type === 'jev' && !config.apiKey?.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter your TypeSafe API Key before testing.',
      })
      setTesting(false)
      return
    }

    let parsedHeaders = config.headers
    try {
      if (headersText.trim()) {
        parsedHeaders = JSON.parse(headersText)
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Invalid Custom Headers JSON format.',
      })
      setTesting(false)
      return
    }

    const testPayload: DecisionProviderConfig = {
      ...config,
      baseUrl: targetUrl,
      headers: parsedHeaders,
    }

    const result = await testDecisionProvider(testPayload, agentServerUrl)
    setTestResult(result)
    setTesting(false)
  }

  const handleSave = () => {
    let parsedHeaders = config.headers
    try {
      if (headersText.trim()) {
        parsedHeaders = JSON.parse(headersText)
      }
    } catch {
      alert('Please check your custom headers JSON formatting.')
      return
    }

    const targetUrl = getEffectiveUrl()
    const updated = {
      ...config,
      baseUrl: targetUrl,
      headers: parsedHeaders,
      updatedAt: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setConfig(updated)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2500)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-2xl tracking-tight">
            <Zap className="size-6 text-amber-500" />
            Decision Models (Clef / Jev / Custom API)
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure non-generative decision models to slash token usage by 85%–95% and speed up web browsing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedSuccess && (
            <Badge variant="outline" className="border-emerald-500 text-emerald-500">
              Settings Saved
            </Badge>
          )}
          <Button onClick={handleSave} className="gap-2">
            Save Settings
          </Button>
        </div>
      </div>

      {/* Overview Card */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-amber-500" />
            Decision Model Routing & Efficiency
          </CardTitle>
          <CardDescription>
            System One models evaluate candidate interactive elements in a single forward pass without generating tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-0">
          <div className="rounded-lg border bg-background p-3">
            <div className="text-muted-foreground text-xs uppercase">Token Usage Reduction</div>
            <div className="font-bold text-emerald-500 text-xl">~85% – 95%</div>
            <div className="text-muted-foreground text-xs">Zero completion tokens on micro-actions</div>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <div className="text-muted-foreground text-xs uppercase">Decision Latency</div>
            <div className="font-bold text-amber-500 text-xl">15 – 50 ms</div>
            <div className="text-muted-foreground text-xs">Compared to 2,500ms on full LLMs</div>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <div className="text-muted-foreground text-xs uppercase">Navigation Speed</div>
            <div className="font-bold text-primary text-xl">10x – 40x Faster</div>
            <div className="text-muted-foreground text-xs">Batched multi-action execution</div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Provider Configuration</CardTitle>
              <CardDescription>
                Select Cloudflare Clef-flash, TypeSafe Jev, or any custom System One decision endpoint.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetToDefaults}
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3" />
              Reset to Preset Defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="font-medium text-sm">Enable Decision Model Routing</Label>
              <div className="text-muted-foreground text-xs">
                Route element disambiguation and micro-actions through the decision model.
              </div>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, enabled: checked }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Provider Preset</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['cloudflare-clef', 'jev', 'custom'] as const).map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={config.type === preset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetChange(preset)}
                  className="w-full text-xs"
                >
                  {PRESETS[preset].name}
                </Button>
              ))}
            </div>
          </div>

          {/* Cloudflare Account ID Field */}
          {config.type === 'cloudflare-clef' && (
            <div className="space-y-1.5 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="cfAccountId" className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                  Cloudflare Account ID
                </Label>
                <span className="text-[11px] text-muted-foreground">From dash.cloudflare.com URL</span>
              </div>
              <Input
                id="cfAccountId"
                value={cfAccountId}
                onChange={(e) => handleAccountIdChange(e.target.value)}
                placeholder="e.g. 32-character hexadecimal Account ID"
                className="font-mono text-xs"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="baseUrl" className="text-xs">Base API URL</Label>
              <Input
                id="baseUrl"
                value={effectiveUrl}
                onChange={(e) => setConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="https://api.cloudflare.com/... or https://api.typesafe.ai/v1/systemone"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modelId" className="text-xs">Model Identifier</Label>
              <Input
                id="modelId"
                value={config.modelId || ''}
                onChange={(e) => setConfig((prev) => ({ ...prev, modelId: e.target.value }))}
                placeholder="cloudflare/clef-flash-9b or typesafe/jev-latest"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apiKey" className="text-xs">
              {config.type === 'cloudflare-clef'
                ? 'Cloudflare Workers AI API Token (Bearer)'
                : config.type === 'jev'
                  ? 'TypeSafe Jev API Key'
                  : 'API Key / Bearer Token (stored locally)'}
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={config.apiKey || ''}
              onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Paste token or leave blank if self-hosted without auth"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="headers" className="text-xs">Custom Headers (JSON)</Label>
            <Textarea
              id="headers"
              rows={2}
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              placeholder='{"X-Custom-Env": "prod"}'
              className="font-mono text-xs"
            />
          </div>

          {/* Performance Switches */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-xs">In-Memory LRU Decision Cache</Label>
                <div className="text-muted-foreground text-[11px]">&lt;1ms instant hits on repeated UI</div>
              </div>
              <Switch
                checked={config.cacheEnabled}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, cacheEnabled: checked }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-xs">Action Batching Engine (#2037)</Label>
                <div className="text-muted-foreground text-[11px]">Click + fill + submit in 1 turn</div>
              </div>
              <Switch
                checked={config.batchingEnabled}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, batchingEnabled: checked }))}
              />
            </div>
          </div>

          {/* Live Target Endpoint Inspector Box */}
          <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-foreground">
                <Globe className="size-3.5 text-primary" />
                Active Target Parameters (Will Be Tested)
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">
                {config.type}
              </Badge>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-muted-foreground break-all">
              <div>
                <strong className="text-foreground">Target URL:</strong>{' '}
                <span className={effectiveUrl.includes('{{account_id}}') ? 'text-rose-500 font-semibold' : 'text-sky-600 dark:text-sky-400'}>
                  {effectiveUrl}
                </span>
              </div>
              <div>
                <strong className="text-foreground">Model:</strong> {config.modelId || 'default'}
              </div>
              <div>
                <strong className="text-foreground">Auth:</strong>{' '}
                {config.apiKey ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Bearer {config.apiKey.slice(0, 4)}••••{config.apiKey.slice(-4)}
                  </span>
                ) : (
                  <span className="text-amber-500">None (Token missing)</span>
                )}
              </div>
            </div>
          </div>

          {/* Test Connection Button & Status */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testing}
                className="gap-2"
              >
                {testing ? <Loader2 className="size-4 animate-spin" /> : <Cpu className="size-4" />}
                Test Connection
              </Button>

              {testResult && (
                <div className="flex items-center gap-1.5 text-xs">
                  {testResult.success ? (
                    <>
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      <span className="font-medium text-emerald-600">
                        {testResult.message}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 text-rose-500 shrink-0" />
                      <span className="text-rose-600">{testResult.message}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
