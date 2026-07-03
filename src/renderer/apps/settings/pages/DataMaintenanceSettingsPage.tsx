import DataMaintenanceTab from '../../resume/components/settings/DataMaintenanceTab'

export default function DataMaintenanceSettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold text-primary">Data Maintenance</h1>
        <p className="text-xs text-muted mt-0.5">
          Salary normalization and data backfill operations
        </p>
      </div>
      <DataMaintenanceTab />
    </div>
  )
}
