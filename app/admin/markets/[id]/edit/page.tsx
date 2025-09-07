"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/app/auth/auth-context'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
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
import { ArrowLeft, Loader2, AlertCircle, Save } from 'lucide-react'
import Link from 'next/link'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { MarketsService } from '@/lib/services/firestore'
import { MarketCategory } from '@/lib/types/database'
import { AdminErrorHandler } from '@/lib/utils/admin-error-handler'

// Form validation schema
const marketEditSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category: z.enum(['entertainment', 'sports', 'politics', 'technology', 'culture', 'reality-tv', 'fashion', 'music', 'other']),
  endsAt: z.string().min(1, 'End date is required'),
})

type MarketEditFormValues = z.infer<typeof marketEditSchema>

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

interface MarketData {
  id: string
  title: string
  description: string
  category: string
  status: string
  createdAt: any
  endsAt: any
  featured?: boolean
  trending?: boolean
}

interface MarketEditPageProps {
  params: { id: string }
}

export default function MarketEditPage({ params }: MarketEditPageProps) {
  const { user } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdminAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [market, setMarket] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with default values
  const form = useForm<MarketEditFormValues>({
    resolver: zodResolver(marketEditSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'entertainment',
      endsAt: '',
    }
  })

  // Load market data
  useEffect(() => {
    const loadMarket = async () => {
      if (!params.id) {
        const errorMsg = 'Market ID is required'
        setError(errorMsg)
        setLoading(false)
        toast({
          title: "Invalid Request",
          description: errorMsg,
          variant: "destructive"
        })
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        console.log('🔍 Loading market for edit:', params.id)
        
        const marketDoc = await getDoc(doc(db, 'markets', params.id))
        
        if (!marketDoc.exists()) {
          const errorMsg = 'Market not found'
          setError(errorMsg)
          setLoading(false)
          toast({
            title: "Market Not Found",
            description: "The requested market could not be found. It may have been deleted.",
            variant: "destructive"
          })
          return
        }

        const marketData = {
          id: marketDoc.id,
          ...marketDoc.data()
        } as MarketData

        console.log('✅ Market loaded:', marketData)
        setMarket(marketData)

        // Pre-populate form with market data
        const endsAtString = marketData.endsAt 
          ? new Date(marketData.endsAt.toMillis()).toISOString().slice(0, 16)
          : ''

        form.reset({
          title: marketData.title || '',
          description: marketData.description || '',
          category: marketData.category as MarketCategory || 'entertainment',
          endsAt: endsAtString,
        })
        
      } catch (err) {
        const adminError = AdminErrorHandler.parseError(err)
        AdminErrorHandler.logError(adminError, 'Market loading')
        
        setError(adminError.message)
        
        // Show toast with appropriate message
        const toastMessage = AdminErrorHandler.getToastMessage(adminError)
        toast({
          title: toastMessage.title,
          description: toastMessage.description,
          variant: "destructive"
        })
        
        // Handle redirects if needed
        if (adminError.shouldRedirect && adminError.redirectPath) {
          const delay = AdminErrorHandler.getRetryDelay(adminError)
          setTimeout(() => {
            router.push(adminError.redirectPath!)
          }, delay)
        }
      } finally {
        setLoading(false)
      }
    }

    // Handle authentication states
    if (!adminLoading) {
      if (!user) {
        setError('Authentication required')
        setLoading(false)
        toast({
          title: "Authentication Required",
          description: "Please log in to access the admin panel.",
          variant: "destructive"
        })
        router.push('/admin/login')
        return
      }
      
      if (!isAdmin) {
        setError('Admin access required')
        setLoading(false)
        toast({
          title: "Access Denied",
          description: "Admin privileges are required to edit markets.",
          variant: "destructive"
        })
        return
      }
      
      // User is authenticated and is admin, load market
      loadMarket()
    }
  }, [params.id, user, isAdmin, adminLoading, form, toast, router])

  // Form submission handler
  async function onSubmit(values: MarketEditFormValues) {
    if (!market || !user) {
      toast({
        title: "Error",
        description: "Missing required data. Please refresh the page and try again.",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      console.log('🔄 Updating market:', market.id, values)
      
      const endsAt = new Date(values.endsAt)
      
      // Validate end date is in the future
      if (endsAt <= new Date()) {
        toast({
          title: "Invalid End Date",
          description: "The end date must be in the future.",
          variant: "destructive"
        })
        setIsSubmitting(false)
        return
      }
      
      await MarketsService.updateMarket(market.id, {
        title: values.title,
        description: values.description,
        category: values.category,
        endsAt: endsAt as any, // Will be converted to Timestamp in service
      }, user.id || user.address) // Pass admin ID for verification

      console.log('✅ Market updated successfully')
      
      // Show success toast
      toast({
        title: "Market Updated",
        description: `"${values.title}" has been updated successfully.`,
        variant: "default"
      })
      
      // Redirect to market list after a short delay
      setTimeout(() => {
        router.push('/admin/markets')
      }, 1500)
      
    } catch (err) {
      const adminError = AdminErrorHandler.parseError(err)
      AdminErrorHandler.logError(adminError, 'Market update')
      
      setError(adminError.message)
      
      // Show toast with appropriate message
      const toastMessage = AdminErrorHandler.getToastMessage(adminError)
      toast({
        title: toastMessage.title,
        description: toastMessage.description,
        variant: "destructive"
      })
      
      // Handle redirects if needed
      if (adminError.shouldRedirect && adminError.redirectPath) {
        const delay = AdminErrorHandler.getRetryDelay(adminError)
        setTimeout(() => {
          router.push(adminError.redirectPath!)
        }, delay)
      } else if (adminError.type === 'not_found') {
        // Redirect to markets list for not found errors
        setTimeout(() => {
          router.push('/admin/markets')
        }, 2000)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state while checking authentication
  if (adminLoading) {
    return <MarketEditPageSkeleton />
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/markets">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Market</h1>
            <p className="text-gray-600">Access denied</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to edit markets. Admin access is required.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show loading state while loading market data
  if (loading) {
    return <MarketEditPageSkeleton />
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/markets">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Market</h1>
            <p className="text-gray-600">Error loading market</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4" />
            Retry
          </Button>
          <Link href="/admin/markets">
            <Button variant="ghost">
              Back to Markets
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Show market not found
  if (!market) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/markets">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Market</h1>
            <p className="text-gray-600">Market not found</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The requested market could not be found. It may have been deleted or the ID is incorrect.
          </AlertDescription>
        </Alert>
        
        <Link href="/admin/markets">
          <Button variant="ghost">
            Back to Markets
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/markets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Market</h1>
          <p className="text-gray-600">Update market information</p>
        </div>
      </div>

      {/* Market Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Market Information</CardTitle>
          <CardDescription>
            Currently editing: {market.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Market ID</p>
                <p className="font-mono">{market.id}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <p className="capitalize">{market.status}</p>
              </div>
              <div>
                <p className="text-gray-500">Category</p>
                <p className="capitalize">{market.category.replace('-', ' ')}</p>
              </div>
              <div>
                <p className="text-gray-500">End Date</p>
                <p>{market.endsAt ? new Date(market.endsAt.toMillis()).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Edit Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Edit Market Information</CardTitle>
              <CardDescription>
                Update the basic information for this market
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title Field */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter market title..." 
                        {...field} 
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description Field */}
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
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Field */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isSubmitting}
                      >
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

                {/* End Date Field */}
                <FormField
                  control={form.control}
                  name="endsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date & Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/admin/markets">
              <Button variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Market
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

function MarketEditPageSkeleton() {
  return (
    <div className="space-y-6" data-testid="market-edit-skeleton">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Market Info Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}