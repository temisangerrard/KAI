"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Sparkles, User, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navigation } from "../components/navigation"
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
      
      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
          {/* Mobile Header */}
          <div className="bg-gradient-to-r from-kai-600 to-gold-600 p-4 text-white">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20" 
                onClick={handleCancel}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold">Edit Profile</h1>
                <p className="text-sm opacity-90">Update your information</p>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold text-sm">{user?.tokenBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Mobile Form Content */}
          <div className="p-4">
            <EditProfileForm 
              user={user} 
              onSubmit={handleProfileUpdate} 
              onCancel={handleCancel} 
            />
          </div>
          
          <Navigation />
        </div>
      </div>

      {/* Desktop Layout - Completely Different & Much Better */}
      <div className="hidden md:block">
        <div className="max-w-4xl mx-auto px-6 py-8">
          
          {/* Desktop Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text">
                  KAI
                </div>
                <div className="w-1 h-6 bg-gray-300"></div>
                <h1 className="text-2xl font-bold text-gray-800">Edit Profile</h1>
              </div>
              <button 
                onClick={handleCancel}
                className="flex items-center gap-2 text-gray-600 hover:text-kai-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Profile</span>
              </button>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <Sparkles className="w-5 h-5 text-kai-600" />
              <span className="font-semibold text-gray-800">{user?.tokenBalance.toLocaleString()} tokens</span>
            </div>
          </div>

          {/* Desktop Content */}
          <div className="grid grid-cols-12 gap-8">
            
            {/* Left Column - Profile Preview */}
            <div className="col-span-4">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-kai-500" />
                  Profile Preview
                </h3>
                
                <div className="text-center mb-6">
                  <div className="relative inline-block mb-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-kai-100 to-kai-200 rounded-full flex items-center justify-center text-kai-700 text-2xl font-bold">
                      {user?.displayName?.charAt(0) || "U"}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-kai-500 rounded-full flex items-center justify-center text-white">
                      <Camera className="w-4 h-4" />
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900">{user?.displayName}</h4>
                  <p className="text-gray-500 text-sm">{user?.email}</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Bio</span>
                    <span className="text-gray-900 font-medium">{user?.bio || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Location</span>
                    <span className="text-gray-900 font-medium">{user?.location || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600">Member since</span>
                    <span className="text-gray-900 font-medium">
                      {user?.joinDate ? new Date(user.joinDate).getFullYear() : "2024"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gradient-to-r from-kai-50 to-kai-100 rounded-lg">
                  <h5 className="font-semibold text-kai-800 mb-2">Profile Tips</h5>
                  <ul className="text-xs text-kai-700 space-y-1">
                    <li>• Add a bio to tell others about yourself</li>
                    <li>• Include your location to connect with locals</li>
                    <li>• Use a clear profile picture</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Column - Edit Form */}
            <div className="col-span-8">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Personal Information</h3>
                  <p className="text-gray-600">Update your profile details to personalize your KAI experience.</p>
                </div>
                
                <EditProfileForm 
                  user={user} 
                  onSubmit={handleProfileUpdate} 
                  onCancel={handleCancel} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}