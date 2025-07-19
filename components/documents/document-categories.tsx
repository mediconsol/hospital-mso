'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Folder, Filter } from 'lucide-react'

interface DocumentCategoriesProps {
  categories: { name: string; count: number; color: string }[]
  selectedCategory: string | null
  onCategorySelect: (category: string | null) => void
}

export function DocumentCategories({ 
  categories, 
  selectedCategory, 
  onCategorySelect 
}: DocumentCategoriesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          카테고리
        </CardTitle>
        <CardDescription>
          문서를 카테고리별로 필터링하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Button
            variant={selectedCategory === null ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => onCategorySelect(null)}
          >
            <FileText className="mr-2 h-4 w-4" />
            전체 문서
          </Button>
          
          {categories.map((category) => (
            <Button
              key={category.name}
              variant={selectedCategory === category.name ? "default" : "ghost"}
              className="w-full justify-between"
              onClick={() => onCategorySelect(category.name)}
            >
              <div className="flex items-center">
                <Folder className="mr-2 h-4 w-4" />
                {category.name}
              </div>
              <Badge variant="secondary" className={category.color}>
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}