import { withRelatedProject } from '@vercel/related-projects';

const backendProjectName = 'paggo-ocr-case-backend';

const defaultApiHost = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

const apiHost = withRelatedProject({
    projectName: backendProjectName,
    defaultHost: defaultApiHost,
});

export async function fetchDataFromBackend() {
    try {
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