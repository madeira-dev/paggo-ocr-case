"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export const Login: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState(""); // Add name state for sign up
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    if (isLoginView) {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError(
          result.error === "CredentialsSignin"
            ? "Invalid email or password."
            : result.error
        );
      } else if (result?.ok) {
        router.push("/");
        router.refresh(); // Force a refresh to update session state properly
      }
    } else {
      // Sign Up Logic
      if (!email || !password || !confirmPassword) {
        setError("All fields are required for sign up.");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Sign up failed. Please try again.");
        } else {
          setSuccessMessage("Sign up successful! Please sign in.");
          setIsLoginView(true); // Switch to login view
          // Optionally, clear form fields
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          setName("");
        }
      } catch (e) {
        console.error("Sign up fetch error:", e);
        setError("An error occurred during sign up. Please try again.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="p-8 bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-white mb-6">
          {isLoginView ? "Welcome Back" : "Create Account"}
        </h2>
        {error && (
          <p className="mb-4 text-center text-sm text-red-400 bg-red-900/30 p-2 rounded">
            {error}
          </p>
        )}
        {successMessage && (
          <p className="mb-4 text-center text-sm text-green-400 bg-green-900/30 p-2 rounded">
            {successMessage}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLoginView && (
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-300"
              >
                Name (Optional)
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Your Name"
                disabled={loading}
              />
            </div>
          )}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isLoginView ? "current-password" : "new-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {!isLoginView && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-300"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
          )}

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-800 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Processing..." : isLoginView ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          {isLoginView ? "Don't have an account?" : "Already have an account?"}
          <button
            onClick={() => {
              setIsLoginView(!isLoginView);
              setError("");
              setSuccessMessage("");
              // Clear form fields on view switch
              setEmail("");
              setPassword("");
              setConfirmPassword("");
              setName("");
            }}
            className="ml-1 font-medium text-indigo-400 hover:text-indigo-300 focus:outline-none"
            disabled={loading}
          >
            {isLoginView ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};
