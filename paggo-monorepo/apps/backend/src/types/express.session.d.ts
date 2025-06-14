import 'express-session';

declare module 'express-session' {
    interface SessionData {
        testData?: string; // Or whatever type testData is meant to be
        // You can add other custom session properties here as well
        // For example, if you were storing userId directly (though Passport handles this differently):
        // userId?: string;
    }
}