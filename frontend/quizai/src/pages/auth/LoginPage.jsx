import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import authService from "../../services/authService";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { APP_NAME } from "../../config/brand";
import BrandLogo from "../../components/common/BrandLogo";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusField, setFocusField] = useState(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authService.login(email, password);
      const token = res.data.token;
      const user = res.data.user;

      if (!token || !user) {
        throw new Error("Invalid login response");
      }
      login(token, user);
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      const message =
        err.message || "Failed to login. Please check your credentials.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[background-size:16px_16px] opacity-30" />

      <div className="relative w-full max-w-md px-6">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-xl shadow-slate-200/60 p-10">
          {/* Header */}
          <div className="text-center mb-10">
            <BrandLogo className="w-20 h-20 mb-3" />
            <p className="text-xl font-bold text-slate-900 mb-4">{APP_NAME}</p>
            <h1 className="text-2xl font-medium text-slate-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-sm text-slate-500">
              Sign in to continue learning with {APP_NAME}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Email
              </label>
              <div className="relative">
                <div
                  className={`absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none transition-colors ${
                    focusField === "email"
                      ? "text-emerald-500"
                      : "text-slate-400"
                  }`}
                >
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusField("email")}
                  onBlur={() => setFocusField(null)}
                  className="w-full h-12 pl-12 pr-4 border-2 border-slate-200 rounded-xl bg-slate-50/50 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:bg-white focus:shadow-lg focus:shadow-emerald-500/10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Password
              </label>
              <div className="relative">
                <div
                  className={`absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none transition-colors ${
                    focusField === "password"
                      ? "text-emerald-500"
                      : "text-slate-400"
                  }`}
                >
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusField("password")}
                  onBlur={() => setFocusField(null)}
                  className="w-full h-12 pl-12 pr-4 border-2 border-slate-200 rounded-xl bg-slate-50/50 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:bg-white focus:shadow-lg focus:shadow-emerald-500/10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-red-600 text-xs font-medium text-center">
                  {error}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm rounded-xl font-semibold transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-50 shadow-lg shadow-emerald-500/25 overflow-hidden cursor-pointer"
            >
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200/60">
            <p className="text-sm text-slate-600 text-center">
              Don&apos;t have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

// import React, { useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { useAuth } from "../../context/AuthContext";
// import authService from "../../services/authService";
// import { BrainCircuit, Mail, Lock, ArrowRight } from "lucide-react";
// import toast from "react-hot-toast";

// const LoginPage = () => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [focusField, setFocusField] = useState(null);

//   const navigate = useNavigate();
//   const { login } = useAuth();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       const { token, user } = await authService.login(email, password);
//       login(token, user);
//       toast.success("Login successful!");
//       navigate("/dashboard");
//     } catch (err) {
//       const message =
//         err?.message || "Failed to login. Please check your credentials.";
//       setError(message);
//       toast.error(message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-50">
//       <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[background-size:16px_16px] opacity-30" />

//       <div className="relative w-full max-w-md px-6">
//         <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-xl p-10">
//           {/* Header */}
//           <div className="text-center mb-10">
//             <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-500 mb-6">
//               <BrainCircuit className="w-7 h-7 text-white" />
//             </div>
//             <h1 className="text-2xl font-medium text-slate-900 mb-2">
//               Welcome Back
//             </h1>
//             <p className="text-sm text-slate-500">
//               Sign in to continue your learning journey
//             </p>
//           </div>

//           {/* FORM */}
//           <form onSubmit={handleSubmit} className="space-y-5">
//             {/* Email */}
//             <div className="space-y-2">
//               <label className="text-xs font-semibold text-slate-700 uppercase">
//                 Email
//               </label>
//               <div className="relative">
//                 <Mail
//                   className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${focusField === "email" ? "text-emerald-500" : "text-slate-400"}`}
//                 />
//                 <input
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   onFocus={() => setFocusField("email")}
//                   onBlur={() => setFocusField(null)}
//                   className="w-full h-12 pl-12 pr-4 border-2 rounded-xl focus:border-emerald-500 focus:outline-none"
//                   placeholder="you@example.com"
//                 />
//               </div>
//             </div>

//             {/* Password */}
//             <div className="space-y-2">
//               <label className="text-xs font-semibold text-slate-700 uppercase">
//                 Password
//               </label>
//               <div className="relative">
//                 <Lock
//                   className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${focusField === "password" ? "text-emerald-500" : "text-slate-400"}`}
//                 />
//                 <input
//                   type="password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   onFocus={() => setFocusField("password")}
//                   onBlur={() => setFocusField(null)}
//                   className="w-full h-12 pl-12 pr-4 border-2 rounded-xl focus:border-emerald-500 focus:outline-none"
//                   placeholder="••••••••"
//                 />
//               </div>
//             </div>

//             {error && (
//               <p className="text-red-600 text-sm text-center">{error}</p>
//             )}

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full h-12 bg-linear-to-r cursor-pointer from-emerald-500 to-teal-500 text-white rounded-xl font-semibold disabled:opacity-50"
//             >
//               {loading ? "Signing in..." : "Sign in"}
//             </button>
//           </form>

//           <p className="text-sm text-center mt-6">
//             Don&apos;t have an account?{" "}
//             <Link
//               to="/register"
//               className="text-emerald-600 font-semibold cursor-pointer"
//             >
//               Sign up
//             </Link>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LoginPage;
