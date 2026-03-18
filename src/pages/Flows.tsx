import React, { useEffect, useState } from 'react';
import { CheckCircle, Plus, Upload } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import {
  createFlow,
  createFlowVersion,
  createFlowWithVersion,
  getFlows,
  publishFlowVersion,
} from '../services/flowService';
import type { FlowDefinition } from '../types';

const Flows = () => {
  const [flows, setFlows] = useState<FlowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [flowVersionJson, setFlowVersionJson] = useState(
    JSON.stringify(
      {
        versionName: 'v1',
        steps: [
          {
            id: 'step_1',
            type: 'SEND_TEMPLATE',
            templateId: 'replace-template-id',
          },
        ],
        transitions: [
          {
            fromStepId: 'step_1',
            operator: 'DEFAULT',
            nextStepId: null,
          },
        ],
      },
      null,
      2
    )
  );

  const loadFlows = async () => {
    setLoading(true);
    try {
      const data = await getFlows();
      setFlows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flows.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlows();
  }, []);

  const handleCreateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await createFlow({ name, description: description || undefined });
      setSuccess('Flow created successfully.');
      setName('');
      setDescription('');
      await loadFlows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create flow.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFlowWithVersion = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const parsed = JSON.parse(flowVersionJson) as Record<string, unknown>;
      await createFlowWithVersion({
        name,
        description: description || undefined,
        ...parsed,
      });
      setSuccess('Flow and first version created successfully.');
      setName('');
      setDescription('');
      await loadFlows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid version JSON or API error.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateVersion = async (flowId: string) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const parsed = JSON.parse(flowVersionJson) as Record<string, unknown>;
      await createFlowVersion(flowId, parsed);
      setSuccess('Flow version created.');
      await loadFlows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create flow version.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (versionId: string) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await publishFlowVersion(versionId);
      setSuccess('Flow version published.');
      await loadFlows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish flow version.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Flow Builder</h1>
        <p className="text-gray-500 mt-1">Create and publish conversation flows.</p>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}
      {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{success}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Create Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCreateFlow}>
            <Input label="Flow Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Version JSON</label>
              <textarea
                className="w-full min-h-44 rounded-lg border border-gray-300 p-3 text-sm font-mono"
                value={flowVersionJson}
                onChange={(e) => setFlowVersionJson(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                <Plus className="w-4 h-4 mr-2" />
                Create Flow Only
              </Button>
              <Button type="button" variant="outline" disabled={saving || !name} onClick={handleCreateFlowWithVersion}>
                <Upload className="w-4 h-4 mr-2" />
                Create Flow + Version
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flows</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-500">Loading flows...</div>
          ) : flows.length === 0 ? (
            <div className="text-sm text-gray-500">No flows found.</div>
          ) : (
            <div className="space-y-4">
              {flows.map((flow) => (
                <div key={flow.id} className="rounded-lg border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{flow.name}</h3>
                      <p className="text-xs text-gray-500">{flow.description || 'No description'}</p>
                    </div>
                    <Button variant="outline" size="sm" disabled={saving} onClick={() => handleCreateVersion(flow.id)}>
                      Create Version
                    </Button>
                  </div>

                  {flow.versions && flow.versions.length > 0 ? (
                    <div className="space-y-2">
                      {flow.versions.map((version) => (
                        <div key={version.id} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2">
                          <div className="text-sm text-gray-700">
                            Version {version.version ?? '-'} • {version.status || 'DRAFT'} • {version.id}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={saving}
                            onClick={() => handlePublish(version.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                            Publish
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">No versions yet.</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Flows;
