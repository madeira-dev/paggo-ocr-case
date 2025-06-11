import { withRelatedProject } from '@vercel/related-projects';

const backendProjectName = 'paggo-ocr-case-backend';

// Define a default host for development or if related project data isn't available
// You might use an environment variable for local development
const defaultApiHost = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'; // Or whatever your local NestJS port is

// Get the API host dynamically
const apiHost = withRelatedProject({
    projectName: backendProjectName,
    defaultHost: defaultApiHost,
});

// Now use apiHost when making requests to your backend
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