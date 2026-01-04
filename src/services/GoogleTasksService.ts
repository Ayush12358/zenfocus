import { gapi } from 'gapi-script';

const SCOPES = 'https://www.googleapis.com/auth/tasks';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest"];

let tokenClient: any = null;

export const GoogleTasksService = {
    initClient: async (clientId: string) => {
        // 1. Load the GAPI Client (for making API requests)
        const loadGapi = new Promise<void>((resolve) => {
            gapi.load('client', async () => {
                await gapi.client.init({
                    // Note: 'clientId' is technically not needed here for GIS, but we keep discoveryDocs
                    discoveryDocs: DISCOVERY_DOCS,
                });
                resolve();
            });
        });

        // 2. Load the GIS Client (for Auth)
        const loadGis = new Promise<void>((resolve, reject) => {
            if ((window as any).google?.accounts) {
                resolve(); // Already loaded
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = (e) => reject(e);
            document.body.appendChild(script);
        });

        await Promise.all([loadGapi, loadGis]);

        // 3. Initialize the Token Client
        if ((window as any).google) {
            tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: (ref: any) => {
                    // This callback isn't used directly if we promise-wrap the sign-in, 
                    // but it's required for initialization. 
                    // We'll handle the token in the signIn promise.
                },
            });
        }

        // 4. Try to restore token from localStorage
        const storedToken = localStorage.getItem('zen_google_token');
        if (storedToken) {
            const token = JSON.parse(storedToken);
            // Basic validity check (optional: check expiry)
            // @ts-ignore
            gapi.client.setToken(token);
        }
    },

    signIn: async () => {
        return new Promise<void>((resolve, reject) => {
            if (!tokenClient) {
                reject(new Error("Token Client not initialized. Reload page?"));
                return;
            }

            // Override the callback for this specific request to handle the promise
            tokenClient.callback = (resp: any) => {
                if (resp.error) {
                    reject(resp);
                } else {
                    // Important: Manually set the token in gapi so gapi.client calls work!
                    // GIS gives us the token, GAPI uses it.
                    // This is the bridge between the two libraries.
                    // We don't need 'gapi.auth2' anymore.
                    // Access token is in resp.access_token
                    // But gapi.client.setToken expects { access_token: ... }
                    // Actually gapi.client.setToken works with the response object directly usually as it matches expected format.
                    // Or we explicitly construct it.
                    // resp contains access_token, scope, expires_in, etc.
                    // setToken takes TokenObject.

                    // Note: gapi.client.setToken is not in typings sometimes, cast to any if needed.
                    // But usually it is.
                    // Wait, gapi-script types might be old.
                    // We'll proceed assuming standard gapi.

                    // We deliberately set it.
                    // @ts-ignore
                    gapi.client.setToken(resp);

                    // Save to localStorage for persistence
                    localStorage.setItem('zen_google_token', JSON.stringify(resp));

                    resolve();
                }
            };

            // Trigger the popup
            tokenClient.requestAccessToken({ prompt: 'consent' });
        });
    },

    signOut: async () => {
        const token = gapi.client.getToken();
        if (token !== null) {
            (window as any).google.accounts.oauth2.revoke(token.access_token, () => {
                gapi.client.setToken(null);
                localStorage.removeItem('zen_google_token');
            });
        }
    },

    isSignedIn: () => {
        // best guess: do we have a token?
        return gapi.client.getToken() !== null;
    },

    // Task Operations
    getTaskLists: async () => {
        try {
            const response = await gapi.client.tasks.tasklists.list();
            return response.result.items || [];
        } catch (error) {
            console.error("Error listing task lists", error);
            throw error;
        }
    },

    listTasks: async (taskListId: string = '@default') => {
        try {
            const response = await gapi.client.tasks.tasks.list({
                tasklist: taskListId,
                showCompleted: true,
                hidden: false
            });
            return response.result.items || [];
        } catch (error) {
            console.error("Error listing tasks", error);
            throw error;
        }
    },

    insertTask: async (title: string, taskListId: string = '@default') => {
        try {
            const response = await gapi.client.tasks.tasks.insert({
                tasklist: taskListId,
                resource: { title: title }
            });
            return response.result;
        } catch (error) {
            console.error("Error inserting task", error);
            throw error;
        }
    },

    updateTask: async (taskId: string, task: any, taskListId: string = '@default') => {
        try {
            const response = await gapi.client.tasks.tasks.update({
                tasklist: taskListId,
                task: taskId,
                resource: task
            });
            return response.result;
        } catch (error) {
            console.error("Error updating task", error);
            throw error;
        }
    },

    toggleTaskCompletion: async (taskId: string, isCompleted: boolean, taskDetails: any, taskListId: string = '@default') => {
        try {
            const resource = {
                status: isCompleted ? 'completed' : 'needsAction'
            };
            // Use PATCH for partial updates (so we don't need full task details)
            const response = await gapi.client.tasks.tasks.patch({
                tasklist: taskListId,
                task: taskId,
                resource: resource
            });
            return response.result;
        } catch (error) {
            console.error("Error toggling task", error);
            throw error;
        }
    },

    deleteTask: async (taskId: string, taskListId: string = '@default') => {
        try {
            await gapi.client.tasks.tasks.delete({
                tasklist: taskListId,
                task: taskId
            });
        } catch (error) {
            console.error("Error deleting task", error);
            throw error;
        }
    }
};
