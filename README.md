# Paggo OCR Case Frontend

Disclaimer: The initial idea was to develop the whole project in a single repository containing both backend and frontend, which would be the best and most elegant approach. It is also possible to notice this initial idea when looking through the structure of this repository (directory called paggo-monorepo, directory called backend…). Although, due to some problems when deploying it to Vercel and considering the given time to complete this project, the best and fastest solution was to split the project in two repositories, one for the frontend and one for the backend. This is the frontend repository.
The backend repository can be found at: https://github.com/madeira-dev/help-nestjs-vercel

As it was already provided, the link to access the deployed project is: https://paggo-ocr-case-ochre.vercel.app

## Running the project locally:

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

Since this project is only a demonstration and has only been developed as part of Paggo's recruitment process and will only be used for this, I will provide the value for almost all environment variables, except OpenAI API key.

For guidance, I will be providing the structure for each file that declares these variables, the only thing that must be done is to fill in the OpenAI API key and the JWT secret.

For the frontend, create a file called .env.local in the [paggo-monorepo/apps/web](https://github.com/madeira-dev/paggo-ocr-case/tree/main/paggo-monorepo/apps/web) directory.
This file must contain the following variables:
```bash
NEXTAUTH_URL="https://paggo-ocr-case-ochre.vercel.app"
NEXTAUTH_SECRET="giw80XketyHMLkzO61cdmcxaCkKIVxUaQhO9O5EHWAw="
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_JYqBdRoEM6mAKSYk_cnNcXJWdxt2dkNPJCDM01xNvY6NPq5"
NEXT_PUBLIC_VERCEL_BLOB_BASE_URL="https://jyqbdroem6maksyk.public.blob.vercel-storage.com/"
NEXT_PUBLIC_BACKEND_URL="https://help-nestjs-vercel.vercel.app"
```

For the backend, create a file called .env in the root directory of the backend repository (https://github.com/madeira-dev/help-nestjs-vercel).
This file must contain the following variables:
```bash
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiMDFKWEdQMzFHQUs5QzQ0MVhQQzBKMjVUNEgiLCJ0ZW5hbnRfaWQiOiI3MTg3MTkyYTE0Yjc1YTk2YWU4NjYxYzg1MjNjN2JmY2IwNjVjMTNiMTc5ZGUxNTIzYjY0YzA0OTg3MjEzMmE3IiwiaW50ZXJuYWxfc2VjcmV0IjoiZjU2ZTM1NjMtOWI3Mi00NDBkLTgyMjEtMjFhNjMzMzMxYTg2In0.Cxc0-NtQpHxFJ6lBVvoLYzjwyiDtw25-0EwWGZop3FE"
VERCEL_OIDC_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im1yay00MzAyZWMxYjY3MGY0OGE5OGFkNjFkYWRlNGEyM2JlNyJ9.eyJpc3MiOiJodHRwczovL29pZGMudmVyY2VsLmNvbS9nYWJyaWVsLW1hZGVpcmFzLXByb2plY3RzLTc1Y2EzNjYyIiwic3ViIjoib3duZXI6Z2FicmllbC1tYWRlaXJhcy1wcm9qZWN0cy03NWNhMzY2Mjpwcm9qZWN0OmhlbHAtbmVzdGpzLXZlcmNlbDplbnZpcm9ubWVudDpkZXZlbG9wbWVudCIsInNjb3BlIjoib3duZXI6Z2FicmllbC1tYWRlaXJhcy1wcm9qZWN0cy03NWNhMzY2Mjpwcm9qZWN0OmhlbHAtbmVzdGpzLXZlcmNlbDplbnZpcm9ubWVudDpkZXZlbG9wbWVudCIsImF1ZCI6Imh0dHBzOi8vdmVyY2VsLmNvbS9nYWJyaWVsLW1hZGVpcmFzLXByb2plY3RzLTc1Y2EzNjYyIiwib3duZXIiOiJnYWJyaWVsLW1hZGVpcmFzLXByb2plY3RzLTc1Y2EzNjYyIiwib3duZXJfaWQiOiJ0ZWFtXzB6NEFGd1htTGdEZzU5Q213dEI3ck1ONCIsInByb2plY3QiOiJoZWxwLW5lc3Rqcy12ZXJjZWwiLCJwcm9qZWN0X2lkIjoicHJqX2JKUnV4QzNjM3JpY29DS2hIb0pBdGNBck1DNTYiLCJlbnZpcm9ubWVudCI6ImRldmVsb3BtZW50IiwidXNlcl9pZCI6Ik05WHA1N1p3VXBLaGZpc0xkd0RtcXVMdCIsIm5iZiI6MTc1MDAxMTMyMiwiaWF0IjoxNzUwMDExMzIyLCJleHAiOjE3NTAwNTQ1MjJ9.O-tYDBo-aR5nOI0Hs6rruzgy-atGckbccbrHazAWAFASPn7BbUtnPi0w8KD_HjbRdOZFUElMtPNknUj_Y-QTvgRZsiw4iPVf9M6lxLxrxRBRbbYEnid0ijlxyFrnhUKCahYs4zOZa2T2a9INjseRePYkE6ip1BPoObm2QO7s7VDojXZNv_RIaULgcl4GlnnNi_g5dNONUBPp2f15keIosrPoahfzugVMb--pKDEWAntPmKjEnpvjxkX5h7npsLHeMIPf7Z-Ko8xB-Sc0r7xli8yJU6pKPe_jG7zYs_DF02g_Rm_Mer2ZSO6Rd6-fLiObeTiAQuxUNGuWdA_btx1TLw"
VERCEL_BLOB_BASE_URL=https://jyqbdroem6maksyk.public.blob.vercel-storage.com/
OPENAI_API_KEY=<please insert your OpenAI API key here>
FRONTEND_URL=https://paggo-ocr-case-ochre.vercel.app
DATABASE_ANY_CLIENT_CONNECTION_URL=postgres://7187192a14b75a96ae8661c8523c7bfcb065c13b179de1523b64c049872132a7:sk_rPKtWddfsVr9VBucAUO7I@db.prisma.io:5432/?sslmode=require
JWT_SECRET=super_secret_jwt_key_here
JWT_EXPIRES_IN=1h
```

## Installing dependencies:
### Frontend:
If you have pnpm installed you may run:
```bash
cd paggo-ocr-case/paggo-monorepo/apps/web/
pnpm install
```

Otherwise, it is possible to achieve the same with npx:
```bash
cd paggo-ocr-case/paggo-monorepo/apps/web/
npx pnpm install
```

### Backend:
```bash
cd help-nestjs-vercel/
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
