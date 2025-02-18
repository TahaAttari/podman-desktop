/**********************************************************************
 * Copyright (C) 2022 Red Hat, Inc.
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

import { app, ipcMain, Tray } from 'electron';
import './security-restrictions';
import { createNewWindow, restoreWindow } from '/@/mainWindow';
import { TrayMenu } from './tray-menu';
import { isMac, isWindows, stoppedExtensions } from './util';
import { AnimatedTray } from './tray-animate-icon';
import { PluginSystem } from './plugin';
import { StartupInstall } from './system/startup-install';
import type { ExtensionLoader } from './plugin/extension-loader';
import dns from 'node:dns';

let extensionLoader: ExtensionLoader | undefined;
/**
 * Prevent multiple instances
 */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', restoreWindow);

/**
 * Disable Hardware Acceleration for more power-save
 */
app.disableHardwareAcceleration();

/**
 * Shout down background process if all windows was closed
 */
app.on('window-all-closed', () => {
  if (!isMac()) {
    app.quit();
  }
});

app.once('before-quit', async event => {
  if (!extensionLoader) {
    stoppedExtensions.val = true;
    return;
  }
  event.preventDefault();
  await extensionLoader
    ?.stopAllExtensions()
    .then(() => {
      console.log('Stopped all extensions');
    })
    .catch((error: unknown) => {
      console.log('Error stopping extensions', error);
    })
    .finally(() => {
      stoppedExtensions.val = true;
      app.quit();
    });
});
/**
 *  @see https://www.electronjs.org/docs/latest/api/app#appsetappusermodelidid-windows
 */
if (isWindows()) {
  app.setAppUserModelId(app.name);
}

let tray: Tray | null = null;

app.whenReady().then(
  async () => {
    // We must create the window first before initialization so that we can load the
    // configuration as well as plugins
    // The window is hiddenly created and shown when ready

    // Platforms: Linux, macOS, Windows
    // Create the main window
    createNewWindow();

    // Platforms: macOS
    // Required for macOS to start the app correctly (this is will be shown in the dock)
    // We use 'activate' within whenReady in order to gracefully start on macOS, see this link:
    // https://www.electronjs.org/docs/latest/tutorial/quick-start#open-a-window-if-none-are-open-macos
    app.on('activate', createNewWindow);

    // prefer ipv4 over ipv6
    // TODO: Needs to be there until Happy Eyeballs(https://en.wikipedia.org/wiki/Happy_Eyeballs) is implemented
    // which is the case in Node.js 20+ https://github.com/nodejs/node/issues/41625
    dns.setDefaultResultOrder('ipv4first');

    // Setup the default tray icon + menu items
    const animatedTray = new AnimatedTray();
    tray = new Tray(animatedTray.getDefaultImage());
    animatedTray.setTray(tray);
    const trayMenu = new TrayMenu(tray, animatedTray);

    // Start extensions
    const pluginSystem = new PluginSystem(trayMenu);
    extensionLoader = await pluginSystem.initExtensions();

    // Get the configuration registry (saves all our settings)
    const configurationRegistry = extensionLoader.getConfigurationRegistry();

    // If we've manually set the tray icon color, update the tray icon. This can only be done
    // after configurationRegistry is loaded. Windows or Linux support only for icon color change.
    if (!isMac()) {
      const color = configurationRegistry.getConfiguration('preferences').get('TrayIconColor');
      if (typeof color === 'string') {
        animatedTray.setColor(color);
      }
    }

    // Share configuration registry with renderer process
    ipcMain.emit('configuration-registry', '', configurationRegistry);

    // Configure automatic startup
    const automaticStartup = new StartupInstall(configurationRegistry);
    await automaticStartup.configure();
  },
  (e: unknown) => console.error('Failed to start app:', e),
);
