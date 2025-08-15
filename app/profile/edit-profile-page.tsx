"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditProfileForm } from "./edit-profile-form"
import { useAuth } from "../auth/auth-context"
import { useToast } from "@/hooks/use-toast"

export default function EditProfilePage() {
  const { user, isLoading, isAuthenticated, updateUser } = useAuth()
  const router = useRouter()
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const { toast } = useToast()

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isLoading, isAuthenticated, router])

  if (!user) {
    return null
  }

  const handleProfileUpdate = (values: any) => {
    // Update user profile with form values
    updateUser({
      displayName: values.displayName,
      bio: values.bio,
      location: values.location,
      // Use the profileImage from values if provided
      ...(values.profileImage && { profileImage: values.profileImage }),
    })
    
    // Show success toast
    toast({
      title: "Profile updated",
      description: "Your profile has been updated successfully.",
    })
    
    // Navigate back to profile page
    router.push("/profile")
  }

  const handleCancel = () => {
    router.push("/profile")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-purple-50">
      <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-400 to-kai-600 p-4 text-white">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20" 
              onClick={handleCancel}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Profile</h1>
              <p className="text-sm opacity-90">Update your information</p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-4">
          <EditProfileForm 
            user={user} 
            onSubmit={handleProfileUpdate} 
            onCancel={handleCancel} 
          />
        </div>
      </div>
    </div>
  )
}