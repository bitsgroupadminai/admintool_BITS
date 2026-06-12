import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import {
  FieldWrapper,
  SubmitButton,
  InputBase,
  InputNormal,
  InputError,
} from "./LoginPage";

const signupSchema = z.object({
  instituteName: z.string().min(2, "Institute name is required"),
  adminName: z.string().min(2, "Your name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const textFields = [
  {
    id: "instituteName",
    label: "Institute Name",
    type: "text",
    placeholder: "e.g. Delhi Public School",
    icon: Building2,
    autoComplete: "organization",
  },
  {
    id: "adminName",
    label: "Your Full Name",
    type: "text",
    placeholder: "Full name",
    icon: User,
    autoComplete: "name",
  },
  {
    id: "email",
    label: "Email Address",
    type: "email",
    placeholder: "you@institute.edu",
    icon: Mail,
    autoComplete: "email",
  },
];

export function SignupPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const { data } = await authApi.signup(values);
      setUser(data.data.user);
      toast.success("Institute created. Let's finish setup.");
      navigate("/setup/institute", { replace: true });
    } catch (err) {
      toast.error(err.message || "Could not create account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your institute"
      subtitle="Register as the first admin for your institution"
      heroTitle="Set up your institute in minutes."
      heroSubtitle="One account to manage your entire institution — staff, services, and more."
      wide
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FieldWrapper
          id="instituteName"
          label="Institute Name"
          icon={Building2}
          error={errors.instituteName?.message}
        >
          <input
            id="instituteName"
            type="text"
            autoComplete="organization"
            placeholder="e.g. Delhi Public School"
            {...register("instituteName")}
            className={cn(
              InputBase,
              errors.instituteName ? InputError : InputNormal,
            )}
          />
        </FieldWrapper>

        <FieldWrapper
          id="adminName"
          label="Your Full Name"
          icon={User}
          error={errors.adminName?.message}
        >
          <input
            id="adminName"
            type="text"
            autoComplete="name"
            placeholder="Full name"
            {...register("adminName")}
            className={cn(
              InputBase,
              errors.adminName ? InputError : InputNormal,
            )}
          />
        </FieldWrapper>

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
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            {...register("password")}
            className={cn(
              InputBase,
              "pr-11",
              errors.password ? InputError : InputNormal,
            )}
          />
        </FieldWrapper>

        <p className="text-[0.72rem] text-[#9CA3AF] -mt-2 leading-relaxed">
          Use 8+ characters with a mix of letters, numbers &amp; symbols.
        </p>

        <SubmitButton
          submitting={submitting}
          label="Create account"
          loadingLabel="Creating account…"
        />
      </form>

      <p className="text-center text-[0.85rem] text-[#6B7280] pt-1">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-[#0A6640] transition-colors hover:text-[#052E1C]"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
