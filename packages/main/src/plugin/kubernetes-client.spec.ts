/**********************************************************************
 * Copyright (C) 2023 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import { beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { KubernetesClient } from './kubernetes-client';
import type { ApiSenderType } from './api';
import type { ConfigurationRegistry } from './configuration-registry';
import { FilesystemMonitoring } from './filesystem-monitoring';
import { KubeConfig } from '@kubernetes/client-node';

const configurationRegistry: ConfigurationRegistry = {} as unknown as ConfigurationRegistry;
const fileSystemMonitoring: FilesystemMonitoring = new FilesystemMonitoring();
const makeApiClientMock = vi.fn();

beforeAll(() => {
  vi.mock('@kubernetes/client-node', async () => {
    return {
      KubeConfig: vi.fn(),
      CoreV1Api: {},
      AppsV1Api: {},
      CustomObjectsApi: {},
      NetworkingV1Api: {},
      VersionApi: {},
    };
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  KubeConfig.prototype.loadFromFile = vi.fn();
  KubeConfig.prototype.makeApiClient = makeApiClientMock;
});

test('Create Kubernetes resources with empty should return ok', async () => {
  const client = new KubernetesClient({} as ApiSenderType, configurationRegistry, fileSystemMonitoring);
  await client.createResources('dummy', []);
});

test('Create Kubernetes resources with v1 resource should return ok', async () => {
  const client = new KubernetesClient({} as ApiSenderType, configurationRegistry, fileSystemMonitoring);
  const spy = vi.spyOn(client, 'createV1Resource').mockReturnValue(Promise.resolve());
  await client.createResources('dummy', [{ apiVersion: 'v1', kind: 'Namespace' }]);
  expect(spy).toBeCalled();
});

test('Create Kubernetes resources with apps/v1 resource should return ok', async () => {
  const client = new KubernetesClient({} as ApiSenderType, configurationRegistry, fileSystemMonitoring);
  const createNamespacedDeploymentMock = vi.fn();
  makeApiClientMock.mockReturnValue({
    createNamespacedDeployment: createNamespacedDeploymentMock,
  });

  await client.createResources('dummy', [{ apiVersion: 'apps/v1', kind: 'Deployment' }]);
  expect(createNamespacedDeploymentMock).toBeCalledWith('default', { apiVersion: 'apps/v1', kind: 'Deployment' });
});

test('Create Kubernetes resources with networking.k8s.io/v1 resource should return ok', async () => {
  const client = new KubernetesClient({} as ApiSenderType, configurationRegistry, fileSystemMonitoring);
  const createNamespacedIngressMock = vi.fn();
  makeApiClientMock.mockReturnValue({
    createNamespacedIngress: createNamespacedIngressMock,
  });

  await client.createResources('dummy', [{ apiVersion: 'networking.k8s.io/v1', kind: 'Ingress' }]);
  expect(createNamespacedIngressMock).toBeCalledWith('default', {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
  });
});

test('Create Kubernetes resources with v1 resource in error should return error', async () => {
  const client = new KubernetesClient({} as ApiSenderType, configurationRegistry, fileSystemMonitoring);
  const spy = vi.spyOn(client, 'createV1Resource').mockRejectedValue(new Error('V1Error'));
  try {
    await client.createResources('dummy', [{ apiVersion: 'v1', kind: 'Namespace' }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    expect(spy).toBeCalled();
    expect(err).to.be.a('Error');
    expect(err.message).equal('V1Error');
  }
});

test('Create custom Kubernetes resources should return ok', async () => {
  const client = new KubernetesClient({} as ApiSenderType, configurationRegistry, fileSystemMonitoring);
  const spy = vi.spyOn(client, 'createCustomResource').mockReturnValue(Promise.resolve());
  vi.spyOn(client, 'getPlural').mockReturnValue(Promise.resolve('namespaces'));
  await client.createResources('dummy', [{ apiVersion: 'group/v1', kind: 'Namespace' }]);
  expect(spy).toBeCalled();
});

test('Create custom Kubernetes resources in error should return error', async () => {
  const client = new KubernetesClient({} as ApiSenderType, configurationRegistry, fileSystemMonitoring);
  const spy = vi.spyOn(client, 'createCustomResource').mockRejectedValue(new Error('CustomError'));
  vi.spyOn(client, 'getPlural').mockReturnValue(Promise.resolve('namespaces'));
  try {
    await client.createResources('dummy', [{ apiVersion: 'group/v1', kind: 'Namespace' }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    expect(spy).toBeCalled();
    expect(err).to.be.a('Error');
    expect(err.message).equal('CustomError');
  }
});

test('Create unknown custom Kubernetes resources should return error', async () => {
  const client = new KubernetesClient({} as ApiSenderType, configurationRegistry, fileSystemMonitoring);
  const createSpy = vi.spyOn(client, 'createCustomResource').mockReturnValue(Promise.resolve());
  const pluralSpy = vi.spyOn(client, 'getPlural').mockRejectedValue(new Error('CustomError'));
  try {
    await client.createResources('dummy', [{ apiVersion: 'group/v1', kind: 'Namespace' }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    expect(createSpy).not.toBeCalled();
    expect(pluralSpy).toBeCalled();
    expect(err).to.be.a('Error');
    expect(err.message).equal('CustomError');
  }
});

test('Check connection to Kubernetes cluster', async () => {
  // Mock k8sApi.getCode() to return the version of the cluster
  makeApiClientMock.mockReturnValue({
    getCode: () => Promise.resolve({ body: { gitVersion: 'v1.20.0' } }),
  });

  const client = new KubernetesClient({} as ApiSenderType, configurationRegistry, fileSystemMonitoring);
  const result = await client.checkConnection();
  expect(result).toBeTruthy();
});

test('Check connection to Kubernetes cluster in error', async () => {
  // Mock k8sApi.getCode() to return the version of the cluster
  makeApiClientMock.mockReturnValue({
    getCode: () => Promise.reject(new Error('K8sError')),
  });

  const client = new KubernetesClient({} as ApiSenderType, configurationRegistry, fileSystemMonitoring);
  const result = await client.checkConnection();
  expect(result).toBeFalsy();
});
