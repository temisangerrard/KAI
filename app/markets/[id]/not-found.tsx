import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Navigation } from "../../components/navigation"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-primary-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link href="/markets">
          <Button
            variant="ghost"
            className="mb-6 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Markets
          </Button>
        </Link>
        
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="bg-red-50 p-4 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">
              Market Not Found
            </h3>
            <p className="text-gray-600 max-w-md">
              The market you're looking for doesn't exist or may have been removed.
            </p>
            <div className="flex gap-3">
              <Link href="/markets">
                <Button 
                  variant="outline"
                >
                  Browse Markets
                </Button>
              </Link>
              <Link href="/markets/create">
                <Button 
                  className="bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white"
                >
                  Create Market
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
      
      <Navigation />
    </div>
  )
}