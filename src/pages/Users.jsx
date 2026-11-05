import React from 'react';
import {PageHeader, Card, StatusBadge, Pagination, usePagination} from '../components/ui/Primitives';
import {useApp} from '../context/AppContext';

export default function Users() {
  const {users, role} = useApp();
  const pager = usePagination(users, 8);
  return <>
    <PageHeader title="User management" description="Role-based access for administrators, supervisors and coordinators."/>
    {role !== 'Administrator'
      ? <Card className="p-6">Only administrators can manage users.</Card>
      : <Card className="overflow-hidden">
          <div className="table-scroll"><table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
            <tbody>{pager.rows.map(u => <tr key={u.id}><td className="font-semibold">{u.name}</td><td>{u.email}</td><td>{u.role}</td><td><StatusBadge status={u.status}/></td></tr>)}</tbody>
          </table></div>
          <Pagination pager={pager}/>
        </Card>}
  </>;
}
