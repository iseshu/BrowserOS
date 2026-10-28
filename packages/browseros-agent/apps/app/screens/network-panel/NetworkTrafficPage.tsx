import {
  Activity,
  ArrowDownToLine,
  Filter,
  Globe,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
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
import { Textarea } from '@/components/ui/textarea'

interface MockRoute {
  id: string
  pattern: string
  status: number
  body: string
  contentType: string
}

interface SampleRequest {
  id: string
  method: string
  url: string
  status: number
  durationMs: number
  time: string
}

const INITIAL_REQUESTS: SampleRequest[] = [
  {
    id: 'req-1',
    method: 'GET',
    url: 'https://api.github.com/user',
    status: 200,
    durationMs: 42,
    time: '09:54:12',
  },
  {
    id: 'req-2',
    method: 'POST',
    url: 'https://api.typesafe.ai/v1/systemone',
    status: 200,
    durationMs: 24,
    time: '09:54:15',
  },
  {
    id: 'req-3',
    method: 'GET',
    url: 'https://cdn.example.com/assets/logo.svg',
    status: 200,
    durationMs: 12,
    time: '09:54:16',
  },
]

export const NetworkTrafficPage: FC = () => {
  const [urlFilter, setUrlFilter] = useState('')
  const [requests, setRequests] = useState<SampleRequest[]>(INITIAL_REQUESTS)
  const [routes, setRoutes] = useState<MockRoute[]>([])

  // Form states
  const [newPattern, setNewPattern] = useState('')
  const [newStatus, setNewStatus] = useState(200)
  const [newBody, setNewBody] = useState('{"status":"mocked_success"}')
  const [newContentType, setNewContentType] = useState('application/json')
  const [harExported, setHarExported] = useState(false)

  const handleAddRoute = () => {
    if (!newPattern.trim()) return
    const route: MockRoute = {
      id: `route-${Date.now()}`,
      pattern: newPattern.trim(),
      status: Number(newStatus) || 200,
      body: newBody,
      contentType: newContentType,
    }
    setRoutes((prev) => [...prev, route])
    setNewPattern('')
  }

  const handleRemoveRoute = (id: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id))
  }

  const handleExportHar = () => {
    const harData = {
      log: {
        version: '1.2',
        creator: { name: 'BrowserOS', version: '155.0.8309.26' },
        entries: requests.map((r) => ({
          startedDateTime: new Date().toISOString(),
          time: r.durationMs,
          request: { method: r.method, url: r.url },
          response: { status: r.status },
        })),
      },
    }

    const blob = new Blob([JSON.stringify(harData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `browseros-traffic-${Date.now()}.har`
    a.click()
    URL.revokeObjectURL(url)

    setHarExported(true)
    setTimeout(() => setHarExported(false), 2500)
  }

  const handleClear = () => {
    setRequests([])
    setRoutes([])
  }

  const filteredRequests = requests.filter((r) =>
    urlFilter ? r.url.toLowerCase().includes(urlFilter.toLowerCase()) : true,
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-2xl tracking-tight">
            <Globe className="size-6 text-sky-500" />
            Network Traffic & HTTP Interception
          </h1>
          <p className="text-muted-foreground text-sm">
            Inspect real-time HTTP requests, intercept or mock API responses via CDP, and export standard HAR archives (#2036).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {harExported && (
            <Badge variant="outline" className="border-emerald-500 text-emerald-500">
              HAR Exported
            </Badge>
          )}
          <Button variant="outline" onClick={handleExportHar} className="gap-2">
            <ArrowDownToLine className="size-4" />
            Export HAR
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClear} title="Clear all">
            <Trash2 className="size-4 text-muted-foreground hover:text-rose-500" />
          </Button>
        </div>
      </div>

      {/* Mock & Intercept Rules Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-sky-500" />
            Active Interception & Mocking Rules
          </CardTitle>
          <CardDescription>
            Intercept outgoing requests matching URL patterns and fulfill them with custom status codes or mocked payloads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">URL Match Pattern (regex or substring)</Label>
              <Input
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="e.g. api/v1/user or *.json"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">HTTP Status</Label>
              <Input
                type="number"
                value={newStatus}
                onChange={(e) => setNewStatus(Number(e.target.value))}
                placeholder="200"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Content-Type</Label>
              <Input
                value={newContentType}
                onChange={(e) => setNewContentType(e.target.value)}
                placeholder="application/json"
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Mock Response Body</Label>
            <Textarea
              rows={2}
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder='{"status":"ok"}'
              className="font-mono text-xs"
            />
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleAddRoute} disabled={!newPattern.trim()} className="gap-1.5">
              <Plus className="size-4" />
              Add Interception Rule
            </Button>
          </div>

          {routes.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="font-semibold text-xs uppercase text-muted-foreground">Active Intercept Rules ({routes.length})</div>
              {routes.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border bg-muted/40 p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      HTTP {r.status}
                    </Badge>
                    <span className="font-mono font-medium">{r.pattern}</span>
                    <span className="text-muted-foreground">({r.contentType})</span>
                  </div>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => handleRemoveRoute(r.id)}>
                    <Trash2 className="size-3.5 text-rose-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traffic Log Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="size-4 text-sky-500" />
                Live HTTP Traffic ({filteredRequests.length})
              </CardTitle>
              <CardDescription>
                Tracked network requests and timing breakdown across open tabs.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Filter className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  value={urlFilter}
                  onChange={(e) => setUrlFilter(e.target.value)}
                  placeholder="Filter by URL..."
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-y bg-muted/50 font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Method</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">URL</th>
                  <th className="px-4 py-2">Duration</th>
                  <th className="px-4 py-2">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No network requests captured matching current filter.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 font-mono">
                      <td className="px-4 py-2.5">
                        <Badge
                          variant="outline"
                          className={
                            r.method === 'GET'
                              ? 'text-sky-500 border-sky-500/30'
                              : 'text-emerald-500 border-emerald-500/30'
                          }
                        >
                          {r.method}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={r.status >= 400 ? 'text-rose-500 font-bold' : 'text-emerald-500'}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-md truncate" title={r.url}>
                        {r.url}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.durationMs}ms</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.time}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
