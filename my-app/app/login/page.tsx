"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";



export default function LoginPage() {
    const {login} = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);

        const form = new FormData(e.currentTarget);
        const username = form.get("username") as string;
        const password = form.get("password") as string;

        try {
            await login(username, password);
            router.push("/"); // redirect after login
        } catch (err) {
            setError("Invalid username or password");
        } finally {
            setLoading(false);
    }
    }   

    return (
        <div className="flex min-h-screen">
            <div className="w-1/3 relative">
                <img
                src="/charging_login_image.jpg"
                alt="Login"
                className="h-full w-full object-cover clip-diagonal"
                />
                <div className="absolute top-0 left-0 h-full w-full bg-gray-50/20"></div>
                {/* Overlay to cover top-right triangle with form background */}
                <div className="absolute top-0 right-0 h-full w-full clip-overlay bg-gray-50"></div>
                <style jsx>{`
                    .clip-overlay {
                        clip-path: polygon(50% 0, 100% 0, 100% 100%);
                    }
                `}</style>
            </div>


            <div className = "w-2/3 bg-gray-50 text-center flex items-center justify-center min-h-screen flex-col space-y-1 sm:space-y-3 lg:space-y-5">
                <form onSubmit={handleSubmit}>

                    <h1 className="text-gray-700 text-2xl font-semibold mb-6 text-center">
                        Sign in
                    </h1>

                    {error && (
                        <p className="mb-4 text-red-600 text-sm text-center">
                            {error}
                        </p>
                    )}

                    <div className="text-gray-700 text-left mb-4">
                    <label className="">Username</label>
                    <input
                        name="username"
                        required
                        className="w-full border-1 border-gray-300 px-3 py-2 rounded-md"
                    />
                    </div>

                    <div className="text-gray-700  text-left mb-1">
                        <label className="">Password</label>
                        <input
                            name="password"
                            type="password"
                            required
                            className="w-full border-1 border-gray-300 border px-3 py-2 rounded-md"
                        />
                    </div>
                    <div className = "text-left mb-6">
                    <a
                        href="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExcTF1OHJmbHFsdHBzaXJ6M29qcnlsa3BzcDAzMWc0YnZhNzQ4aDI4NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/7GPV80dC4GCNq/giphy.gif"
                        className="text-gray-400  text-xs text-[#06b6d4] cursor-pointer"
                    >
                        Forgot password? Get fucked...
                    </a>
                    </div>

                    <button
                        disabled={loading}
                        className={`flex items-center justify-center w-full py-2 border-1 border-[#06b6d4]  text-white text-center rounded-md
                            ${loading
                                ? "bg-[rgba(6,182,212,0.7) font-bold"
                                : "bg-[rgba(6,182,212,0.5)] hover:bg-[rgba(6,182,212,0.7)] hover:font-semibold"    
                                }
                        
                        `}
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}
