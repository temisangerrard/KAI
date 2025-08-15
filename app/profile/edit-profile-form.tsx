"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User } from "../auth/auth-context"
import { Camera } from "lucide-react"

// Form schema
const profileFormSchema = z.object({
  displayName: z.string().min(2, {
    message: "Display name must be at least 2 characters.",
  }),
  bio: z.string().max(160, {
    message: "Bio cannot be more than 160 characters.",
  }).optional(),
  location: z.string().max(50, {
    message: "Location cannot be more than 50 characters.",
  }).optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

interface EditProfileFormProps {
  user: User
  onSubmit: (values: ProfileFormValues & { profileImage?: string }) => void
  onCancel: () => void
}

export function EditProfileForm({ user, onSubmit, onCancel }: EditProfileFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(user.profileImage || null)
  
  // Initialize form with current user data
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user.displayName || "",
      bio: user.bio || "",
      location: user.location || "",
    },
  })

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle form submission
  const handleFormSubmit = (values: ProfileFormValues) => {
    onSubmit({
      ...values,
      profileImage: imagePreview || undefined
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Profile Image */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-white shadow">
              <AvatarImage src={imagePreview || "/placeholder-user.jpg"} />
              <AvatarFallback className="bg-kai-100 text-kai-700">
                {user.displayName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <label 
              htmlFor="profile-image" 
              className="absolute bottom-0 right-0 bg-kai-500 text-white p-1 rounded-full cursor-pointer shadow-md"
            >
              <Camera className="h-4 w-4" />
              <input 
                id="profile-image" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageChange}
              />
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">Tap the camera icon to change your profile picture</p>
        </div>

        {/* Display Name */}
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="Your display name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Bio */}
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tell us a little about yourself" 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="Your location" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  )
}