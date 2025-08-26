"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { MarketsService } from '@/lib/services/firestore'
import { MarketCategory, MarketStatus } from '@/lib/types/database'
import { useAuth } from '@/app/auth/auth-context'

const marketSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category: z.enum(['entertainment', 'sports', 'politics', 'technology', 'culture', 'reality-tv', 'fashion', 'music', 'other']),
  status: z.enum(['draft', 'active']),
  endsAt: z.string().min(1, 'End date is required'),
  tags: z.string(),
  featured: z.boolean(),
  trending: z.boolean(),
  options: z.array(z.object({
    text: z.string().min(1, 'Option text is required')
  })).min(2, 'At least 2 options are required')
})

type MarketFormValues = z.infer<typeof marketSchema>

const categories: { value: MarketCategory; label: string }[] = [
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'sports', label: 'Sports' },
  { value: 'politics', label: 'Politics' },
  { value: 'technology', label: 'Technology' },
  { value: 'culture', label: 'Culture' },
  { value: 'reality-tv', label: 'Reality TV' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'music', label: 'Music' },
  { value: 'other', label: 'Other' }
]

export default function CreateMarketPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<MarketFormValues>({
    resolver: zodResolver(marketSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'entertainment',
      status: 'draft',
      endsAt: '',
      tags: '',
      featured: false,
      trending: false,
      options: [
        { text: '' },
        { text: '' }
      ]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options'
  })

  async function onSubmit(values: MarketFormValues) {
    if (!user) return

    setIsSubmitting(true)
    try {
      const endsAt = new Date(values.endsAt)
      const tags = values.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      
      const options = values.options.map((option, index) => ({
        id: `option_${index + 1}`,
        text: option.text,
        totalTokens: 0,
        participantCount: 0
      }))

      await MarketsService.createMarket({
        title: values.title,
        description: values.description,
        category: values.category,
        status: values.status as MarketStatus,
        createdBy: user.id,
        endsAt: endsAt as any, // Will be converted to Timestamp in service
        tags,
        options,
        featured: values.featured,
        trending: values.trending
      })

      router.push('/admin/markets')
    } catch (error) {
      console.error('Error creating market:', error)
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/markets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Market</h1>
          <p className="text-gray-600">Set up a new prediction market for users</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Market Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Who will win BBNaija All Stars?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the market and what users are predicting..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />



              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="bbnaija, reality-tv, entertainment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {/* Prediction Options */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Prediction Options</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ text: '' })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-start">
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name={`options.${index}.text`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Option {index + 1}</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter prediction option..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-8"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Market Settings</h2>
            
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft (Not visible to users)</SelectItem>
                        <SelectItem value="active">Active (Live for predictions)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="featured">Featured Market</Label>
                  <p className="text-sm text-gray-500">Show this market prominently on the homepage</p>
                </div>
                <FormField
                  control={form.control}
                  name="featured"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="trending">Trending Market</Label>
                  <p className="text-sm text-gray-500">Mark this market as trending</p>
                </div>
                <FormField
                  control={form.control}
                  name="trending"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/admin/markets">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Save className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Market
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}