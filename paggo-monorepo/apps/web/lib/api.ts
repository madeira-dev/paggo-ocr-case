import { withRelatedProject } from '@vercel/related-projects';

const backendProjectName = 'paggo-ocr-case-backend';

/* swap the commented lines below when deploying! (related to defaultApiHost) */

// const defaultApiHost = 'https://paggo-ocr-case-backend.vercel.app'; // deployment
const defaultApiHost = 'http://localhost:3000'; // local development

const apiHost = withRelatedProject({
    projectName: backendProjectName,
    defaultHost: defaultApiHost,
});

export async function fetchDataFromBackend() {
    try {
        console.log("apihost:", apiHost)
        const response = await fetch(`${apiHost}/hello`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data from backend:', error);
        throw error;
    }
}