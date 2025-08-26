"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { authService } from "@/lib/auth/auth-service"

// Define form schema with validation
const resetSchema = z.object({
  email: z
    .string()
    .email({ message: "Please enter a valid email address" }),
})

type ResetFormValues = z.infer<typeof resetSchema>

interface PasswordResetFormProps {
  onBackToLogin: () => void
}

export function PasswordResetForm({ onBackToLogin }: PasswordResetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(values: ResetFormValues) {
    setIsSubmitting(true)
    setError(null)
    
    try {
      await authService.resetPassword(values.email)
      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Check your email</h1>
          <p className="text-gray-500">
            We've sent a password reset link to your email address.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setIsSuccess(false)
              form.reset()
            }}
          >
            Try again
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBackToLogin}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Reset your password</h1>
        <p className="text-gray-500">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      {error && (
        <div 
          className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-kai-600 to-gold-600 hover:from-kai-700 hover:to-gold-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      </Form>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={onBackToLogin}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to login
      </Button>
    </div>
  )
}