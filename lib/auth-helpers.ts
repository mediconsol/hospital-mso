import { createClient } from '@/lib/supabase'
import { Database } from '@/lib/database.types'

type Employee = Database['public']['Tables']['employee']['Row']

/**
 * Get the employee record for the currently authenticated user
 */
export async function getCurrentEmployee(): Promise<Employee | null> {
  const supabase = createClient()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Since auth_user_id column doesn't exist yet, find by email as primary method
    if (!user.email) {
      throw new Error('User email not available')
    }
    
    const { data: emailEmployee, error: emailError } = await supabase
      .from('employee')
      .select('*')
      .eq('email', user.email)
      .single()

    if (emailEmployee) {
      return emailEmployee
    }

    // If no employee found by email, try to create one automatically
    console.log('No employee found for user:', user.email, 'Attempting to create one...')
    
    // Get first hospital to assign to
    const { data: hospitals, error: hospitalError } = await supabase
      .from('hospital_or_mso')
      .select('*')
      .limit(1)

    if (hospitalError || !hospitals || hospitals.length === 0) {
      console.error('No hospital found to assign employee to')
      return null
    }

    // Create new employee
    const { data: newEmployee, error: empError } = await supabase
      .from('employee')
      .insert([{
        name: user.email?.split('@')[0] || 'New User',
        email: user.email || 'user@example.com',
        hospital_id: hospitals[0].id,
        role: 'employee',
        status: 'active',
      }])
      .select()
      .single()

    if (empError) {
      console.error('Error creating employee:', empError)
      return null
    }

    console.log('Created new employee:', newEmployee)
    return newEmployee
  } catch (error) {
    console.error('Error getting current employee:', error)
    return null
  }
}

/**
 * Create or link an employee record with the authenticated user
 */
export async function linkEmployeeToUser(
  employeeData: {
    name: string
    email: string
    hospital_id: string
    department_id?: string
    role?: string
    position?: string
    phone?: string
    hire_date?: string
  }
): Promise<Employee | null> {
  const supabase = createClient()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Check if employee already exists for this user
    const { data: existingEmployee } = await supabase
      .from('employee')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (existingEmployee) {
      return existingEmployee
    }

    // Create new employee record linked to auth user
    const { data: newEmployee, error: createError } = await supabase
      .from('employee')
      .insert([{
        ...employeeData,
        auth_user_id: user.id,
        email: user.email || employeeData.email,
      }])
      .select()
      .single()

    if (createError) {
      throw createError
    }

    return newEmployee
  } catch (error) {
    console.error('Error linking employee to user:', error)
    return null
  }
}

/**
 * Update existing employee to link with current auth user
 */
export async function updateEmployeeAuthLink(employeeId: string): Promise<Employee | null> {
  const supabase = createClient()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Update employee record to link with auth user
    // auth_user_id 컬럼이 타입에 없어서 any로 캐스팅
    const { data: updatedEmployee, error: updateError } = await supabase
      .from('employee')
      .update({ auth_user_id: user.id } as any)
      .eq('id', employeeId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return updatedEmployee
  } catch (error) {
    console.error('Error updating employee auth link:', error)
    return null
  }
}