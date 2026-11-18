export function isProjectManager(employee: {
  title?: string | null
  employeeRoles?: { role: { slug: string } }[]
} | null | undefined): boolean {
  const title = employee?.title?.toLowerCase() || ''
  return title === 'pm' || title.includes('project manager') ||
    !!employee?.employeeRoles?.some(({ role }) => role.slug.toLowerCase() === 'pm')
}
