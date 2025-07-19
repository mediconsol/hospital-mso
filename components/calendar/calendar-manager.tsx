'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getCurrentEmployee } from '@/lib/auth-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalendarView } from './calendar-view'
import { ScheduleForm } from './schedule-form'
import { ScheduleList } from './schedule-list'
import { ScheduleStats } from './schedule-stats'
import { Calendar, Plus, Search, Filter, Grid, List, Users } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Database } from '@/lib/database.types'

type Schedule = Database['public']['Tables']['schedule']['Row'] & {
  creator?: { id: string; name: string; email: string } | null
  participant_details?: { id: string; name: string; email: string }[]
}
type Employee = Database['public']['Tables']['employee']['Row']
type Department = Database['public']['Tables']['department']['Row']
type HospitalOrMSO = Database['public']['Tables']['hospital_or_mso']['Row']

export function CalendarManager() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [organizations, setOrganizations] = useState<HospitalOrMSO[]>([])
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [filterType, setFilterType] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    initializeUser()
  }, [])
  
  useEffect(() => {
    if (currentEmployee) {
      fetchOrganizations()
    }
  }, [currentEmployee])

  useEffect(() => {
    if (selectedOrg) {
      fetchEmployees(selectedOrg)
      fetchDepartments(selectedOrg)
      fetchSchedules()
    }
  }, [selectedOrg])

  const initializeUser = async () => {
    try {
      const employee = await getCurrentEmployee()
      setCurrentEmployee(employee)
      
      if (employee) {
        setSelectedOrg(employee.hospital_id)
      }
    } catch (error) {
      console.error('Error initializing user:', error)
    }
  }

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('hospital_or_mso')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrganizations(data || [])
      
      // 현재 직원의 병원이 없으면 첫 번째 조직 자동 선택
      if (!selectedOrg && data && data.length > 0) {
        setSelectedOrg(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async (hospitalId: string) => {
    try {
      const { data, error } = await supabase
        .from('employee')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('status', 'active')
        .order('name', { ascending: true })

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchDepartments = async (hospitalId: string) => {
    try {
      const { data, error } = await supabase
        .from('department')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('name', { ascending: true })

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('schedule')
        .select(`
          *,
          creator:creator_id (
            id,
            name,
            email
          )
        `)
        .eq('hospital_id', selectedOrg)
        .order('start_time', { ascending: true })

      if (error) throw error
      
      // 참가자 정보 추가
      const schedulesWithParticipants = await Promise.all(
        (data || []).map(async (schedule) => {
          if (schedule.participants && Array.isArray(schedule.participants) && schedule.participants.length > 0) {
            // Json[] 타입을 string[]로 변환
            const participantIds = schedule.participants.filter((id): id is string => typeof id === 'string')
            
            if (participantIds.length > 0) {
              const { data: participantData, error: participantError } = await supabase
                .from('employee')
                .select('id, name, email')
                .in('id', participantIds)

              if (!participantError) {
                return {
                  ...schedule,
                  participant_details: participantData || []
                }
              }
            }
          }
          return {
            ...schedule,
            participant_details: []
          }
        })
      )

      setSchedules(schedulesWithParticipants)
    } catch (error) {
      console.error('Error fetching schedules:', error)
    }
  }

  const handleScheduleSaved = () => {
    setShowForm(false)
    setEditingSchedule(null)
    fetchSchedules()
  }

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setShowForm(true)
  }

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('정말로 이 일정을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('schedule')
        .delete()
        .eq('id', scheduleId)

      if (error) throw error
      fetchSchedules()
    } catch (error) {
      console.error('Error deleting schedule:', error)
    }
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setEditingSchedule(null)
    setShowForm(true)
  }

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         schedule.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         schedule.location?.toLowerCase().includes(searchTerm.toLowerCase())
    
    let matchesType = true
    if (filterType) {
      const now = new Date()
      const startTime = new Date(schedule.start_time)
      const endTime = new Date(schedule.end_time)
      
      switch (filterType) {
        case 'today':
          matchesType = startTime.toDateString() === now.toDateString()
          break
        case 'week':
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          matchesType = startTime >= weekStart && startTime <= weekEnd
          break
        case 'month':
          matchesType = startTime.getMonth() === now.getMonth() && startTime.getFullYear() === now.getFullYear()
          break
        case 'upcoming':
          matchesType = startTime >= now
          break
        case 'past':
          matchesType = endTime < now
          break
        default:
          matchesType = true
      }
    }
    
    return matchesSearch && matchesType
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">먼저 조직을 등록해주세요.</p>
        <p className="text-sm text-gray-400 mt-2">
          조직 관리 페이지에서 병원 또는 MSO를 등록하세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 조직 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>조직 선택</CardTitle>
          <CardDescription>
            일정을 관리할 조직을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="조직을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name} ({org.type === 'hospital' ? '병원' : 'MSO'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedOrg && (
        <>
          {/* 일정 통계 */}
          <ScheduleStats schedules={schedules} />

          {/* 필터 및 검색 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    일정 관리
                  </CardTitle>
                  <CardDescription>
                    총 {filteredSchedules.length}개의 일정
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'calendar' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('calendar')}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    일정 생성
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* 검색 및 필터 */}
              <div className="flex flex-col gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="일정 제목, 설명, 장소로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-4">
                  {/* 기간 필터 */}
                  <Select value={filterType || 'all'} onValueChange={(value) => setFilterType(value === 'all' ? '' : value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="기간 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 기간</SelectItem>
                      <SelectItem value="today">오늘</SelectItem>
                      <SelectItem value="week">이번 주</SelectItem>
                      <SelectItem value="month">이번 달</SelectItem>
                      <SelectItem value="upcoming">예정된 일정</SelectItem>
                      <SelectItem value="past">지난 일정</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* 필터 초기화 */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFilterType('')
                      setSearchTerm('')
                    }}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    초기화
                  </Button>
                </div>
              </div>

              {/* 일정 표시 */}
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'calendar' | 'list')}>
                <TabsContent value="calendar" className="mt-0">
                  <CalendarView
                    schedules={filteredSchedules}
                    selectedDate={selectedDate}
                    onDateSelect={handleDateSelect}
                    onScheduleClick={handleEdit}
                    onScheduleDelete={handleDelete}
                  />
                </TabsContent>
                <TabsContent value="list" className="mt-0">
                  <ScheduleList
                    schedules={filteredSchedules}
                    employees={employees}
                    departments={departments}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      {/* 일정 생성/수정 폼 */}
      {showForm && currentEmployee && (
        <ScheduleForm
          schedule={editingSchedule}
          hospitalId={selectedOrg}
          employees={employees}
          departments={departments}
          currentUserId={currentEmployee.id}
          initialDate={selectedDate}
          onClose={() => {
            setShowForm(false)
            setEditingSchedule(null)
          }}
          onSaved={handleScheduleSaved}
        />
      )}
    </div>
  )
}