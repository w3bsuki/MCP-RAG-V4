import { Link } from 'react-router-dom'
import { Bot } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <Bot className="h-8 w-8 text-primary-500" />
              <span className="text-xl font-bold">ServiceBot</span>
            </div>
            <p className="text-gray-400 text-sm">
              AI-powered local services marketplace connecting providers and seekers.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">For Providers</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/register" className="hover:text-white">Join as Provider</Link></li>
              <li><Link to="/create-ad" className="hover:text-white">Post Services</Link></li>
              <li><Link to="/dashboard" className="hover:text-white">Manage Ads</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">For Seekers</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/services" className="hover:text-white">Find Services</Link></li>
              <li><Link to="/register" className="hover:text-white">Create Account</Link></li>
              <li><Link to="/messages" className="hover:text-white">Messages</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">Help Center</a></li>
              <li><a href="#" className="hover:text-white">Safety Tips</a></li>
              <li><a href="#" className="hover:text-white">Contact Us</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2024 ServiceBot. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}