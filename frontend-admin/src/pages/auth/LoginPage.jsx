import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const { data } = await authApi.login(values);
      const user = data.data.user;
      setUser(user);
      if (user.role === "admin" && !user.institute?.setupCompleted) {
        navigate("/setup/institute", { replace: true });
      } else if (user.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/staff/dashboard", { replace: true });
      }
    } catch (err) {
      toast.error(err.message || "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your admin account to continue"
      heroTitle="Education institute administration, simplified."
      heroSubtitle="Configure your institute, manage staff, and run all services in one structured workspace."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FieldWrapper
          id="email"
          label="Email Address"
          icon={Mail}
          error={errors.email?.message}
        >
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@institute.edu"
            {...register("email")}
            className={cn(InputBase, errors.email ? InputError : InputNormal)}
          />
        </FieldWrapper>

        <FieldWrapper
          id="password"
          label="Password"
          icon={Lock}
          error={errors.password?.message}
          rightSlot={
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#0A6640] transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.8} />
              ) : (
                <Eye className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.8} />
              )}
            </button>
          }
        >
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            {...register("password")}
            className={cn(
              InputBase,
              "pr-11",
              errors.password ? InputError : InputNormal,
            )}
          />
        </FieldWrapper>

        <div className="flex justify-end -mt-2">
          <Link
            to="/forgot-password"
            className="text-[0.75rem] text-[#0A6640] font-semibold hover:text-[#052E1C] transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <SubmitButton
          submitting={submitting}
          label="Sign in"
          loadingLabel="Signing in…"
        />
      </form>

      <div className="relative flex items-center gap-3 my-1">
        <div className="h-px flex-1 bg-[#E2EEE8]" />
        <span className="text-[0.68rem] font-semibold text-[#A0B8AC] tracking-[0.12em] uppercase">
          or
        </span>
        <div className="h-px flex-1 bg-[#E2EEE8]" />
      </div>

      <p className="text-center text-[0.85rem] text-[#6B7280]">
        New to AdminPortal?{" "}
        <Link
          to="/signup"
          className="font-semibold text-[#0A6640] transition-colors hover:text-[#052E1C]"
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

export function FieldWrapper({
  id,
  label,
  icon: Icon,
  error,
  rightSlot,
  children,
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[0.72rem] font-bold tracking-[0.1em] text-[#4B6358] uppercase"
      >
        {label}
      </label>
      <div className="relative group">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-[1rem] w-[1rem] -translate-y-1/2 text-[#6EE7B7] transition-colors duration-200 group-focus-within:text-[#0A6640]"
          strokeWidth={1.9}
        />
        {children}
        {rightSlot}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-[0.72rem] text-red-500 font-medium mt-1">
          <span className="inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-[9px] font-bold text-red-500">
            !
          </span>
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ submitting, label, loadingLabel }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className={cn(
        "mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[0.875rem] font-semibold tracking-wide transition-all duration-200",
        submitting
          ? "cursor-not-allowed bg-[#34D399] text-white"
          : "bg-[#0A6640] text-white hover:bg-[#084F31] active:scale-[0.988] shadow-[0_2px_18px_rgba(10,102,64,0.3)]",
      )}
    >
      {submitting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          {loadingLabel}
        </>
      ) : (
        <>
          {label}
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </>
      )}
    </button>
  );
}

export const InputBase =
  "h-11 w-full rounded-xl border pl-10 pr-4 text-[0.875rem] text-[#111827] placeholder-[#A8BDB5] outline-none transition-all duration-150 font-normal";
export const InputNormal =
  "bg-[#F0FAF5] border-[#C4E8D4] hover:border-[#6EE7B7] hover:bg-[#EDFAF3] focus:border-[#0A6640] focus:bg-white focus:ring-4 focus:ring-[#0A6640]/8";
export const InputError =
  "bg-red-50/60 border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-400/10";
