# paggo-ocr-case

Disclaimer: The initial idea was to develop the whole project in a single repository containing both backend and frontend, which would be the best and most elegant approach. It is also possible to notice this initial idea when looking through the structure of this repository (directory called paggo-monorepo, directory called backend…). Although, due to some problems when deploying it to Vercel and considering the given time to complete this project, the best and fastest solution was to split the project in two repositories, one for the frontend and one for the backend. This is the frontend repository.
The backend repository can be found at: https://github.com/madeira-dev/help-nestjs-vercel

As it was already provided, the link to access the deployed project is: https://paggo-ocr-case-ochre.vercel.app

Running the project locally:

First, clone each of the repositories:
```bash
mkdir paggo-technical-case
cd paggo-technical-case
# clone frontend project
git clone https://github.com/madeira-dev/paggo-ocr-case/
# clone backend project
git clone https://github.com/madeira-dev/help-nestjs-vercel
```

To run the project locally, a few environment variables must be set for both frontend and the backend.
For guidance, I will be providing the structure for each file that declares these variables, the only thing that must be done is to fill in the empty variables.

For the frontend, create a file called .env.local in the paggo-ocr-case/paggo-monoreppo/apps/web/ directory.
This file must contain the following variables:
```bash
<empty>
```

For the backend, create a file called .env in the root directory of the backend repository (<>).
This file must contain the following variables:
```bash
<empty>
```

Installing dependencies:
Make sure npm and npx are installed?

Frontend:
```bash
cd paggo-ocr-case/paggo-monoreppo/apps/web/
npx pnpm install
```

Backend:
```bash
# in the root directory of the backend repository
npm install
```

After successfully setting the environment variables and installing dependencies, you must open a terminal window for each project to start them in development mode.

For the frontend:
```bash
# in paggo-ocr-case/paggo-monoreppo/apps/web/ directory
npm run dev
```

For the backend:
```bash
# in the root directory of backend repository
npm run start:dev
```

By default, the frontend should start at http://localhost:3001 and the backend at http://localhost:3000. The ports might be different for you so please pay attention at what is printed in the terminal as it tells you where to open each project.
