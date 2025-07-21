'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Building2, Shield, Eye, Edit, UserCheck } from 'lucide-react'
import { useAccessibleOrganizations } from '@/hooks/use-accessible-organizations'

interface OrganizationSelectorProps {
  selectedOrg: string
  onOrgChange: (orgId: string) => void
  title?: string
  description?: string
  showAccessLevel?: boolean
  className?: string
}

export function OrganizationSelector({
  selectedOrg,
  onOrgChange,
  title = "조직 선택",
  description = "작업할 조직을 선택하세요",
  showAccessLevel = true,
  className = ""
}: OrganizationSelectorProps) {
  const { organizationOptions, loading, error } = useAccessibleOrganizations()

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'admin': return <UserCheck className="w-3 h-3" />
      case 'write': return <Edit className="w-3 h-3" />
      case 'read': return <Eye className="w-3 h-3" />
      default: return <Shield className="w-3 h-3" />
    }
  }

  const getAccessLevelLabel = (level: string) => {
    switch (level) {
      case 'admin': return '관리자'
      case 'write': return '쓰기'
      case 'read': return '읽기'
      default: return level
    }
  }

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'write': return 'bg-blue-100 text-blue-800'
      case 'read': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>{title}</span>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>{title}</span>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (organizationOptions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>{title}</span>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-600">접근 가능한 조직이 없습니다.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="w-5 h-5" />
          <span>{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={selectedOrg} onValueChange={onOrgChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="조직을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {organizationOptions.map((org) => (
              <SelectItem key={org.value} value={org.value}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <span>{org.label}</span>
                    <Badge variant={org.isPrimary ? "default" : "secondary"} className="text-xs">
                      {org.type === 'hospital' ? '병원' : 'MSO'}
                    </Badge>
                  </div>
                  {showAccessLevel && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ml-2 ${getAccessLevelColor(org.accessLevel)}`}
                    >
                      <div className="flex items-center space-x-1">
                        {getAccessLevelIcon(org.accessLevel)}
                        <span>{getAccessLevelLabel(org.accessLevel)}</span>
                      </div>
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* 선택된 조직 정보 표시 */}
        {selectedOrg && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
            {(() => {
              const selectedOrgInfo = organizationOptions.find(org => org.value === selectedOrg)
              if (!selectedOrgInfo) return null
              
              return (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      {selectedOrgInfo.label}
                    </span>
                  </div>
                  {showAccessLevel && (
                    <Badge className={getAccessLevelColor(selectedOrgInfo.accessLevel)}>
                      <div className="flex items-center space-x-1">
                        {getAccessLevelIcon(selectedOrgInfo.accessLevel)}
                        <span>{getAccessLevelLabel(selectedOrgInfo.accessLevel)} 권한</span>
                      </div>
                    </Badge>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
