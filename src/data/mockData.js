export const rooms = [
  {id:'RM-01', name:'Room A-101', school:'Kigali Examination Centre', candidates:32, status:'Monitoring', cameras:1, alerts:4, assignedTo:'Aline Uwase'},
  {id:'RM-02', name:'Room A-102', school:'Kigali Examination Centre', candidates:29, status:'Monitoring', cameras:1, alerts:2, assignedTo:'Aline Uwase'},
  {id:'RM-03', name:'Room B-201', school:'Kigali Examination Centre', candidates:35, status:'Monitoring', cameras:1, alerts:3, assignedTo:'Patrick Mugabo'},
  {id:'RM-04', name:'Room B-202', school:'Kigali Examination Centre', candidates:30, status:'Standby', cameras:1, alerts:0, assignedTo:'Patrick Mugabo'},
];
export const initialAlerts = [
  {id:'AL-1028', room:'Room A-101', type:'Phone detected', model:'Phone detection', confidence:94, time:'10:42:18', date:'2026-11-02', priority:'High', status:'Pending', detail:'A possible mobile phone was detected near the back-right seating area.'},
  {id:'AL-1027', room:'Room A-102', type:'Unusual behavior', model:'Behavior detection', confidence:82, time:'10:39:04', date:'2026-11-02', priority:'Medium', status:'Pending', detail:'Unusual movement pattern identified for supervisor review.'},
  {id:'AL-1026', room:'Room B-201', type:'Whispering detected', model:'Sound detection', confidence:78, time:'10:36:25', date:'2026-11-02', priority:'Medium', status:'Pending', detail:'Speech-like audio event identified.'},
  {id:'AL-1025', room:'Room A-101', type:'Phone detected', model:'Phone detection', confidence:89, time:'10:31:10', date:'2026-11-02', priority:'High', status:'Escalated', detail:'Possible phone visible in the recorded frame.'},
  {id:'AL-1024', room:'Room B-201', type:'Unusual behavior', model:'Behavior detection', confidence:74, time:'10:22:57', date:'2026-11-02', priority:'Low', status:'Dismissed', detail:'Movement flagged during a simulated test.'},
  {id:'AL-1023', room:'Room A-102', type:'Whispering detected', model:'Sound detection', confidence:81, time:'10:18:46', date:'2026-11-02', priority:'Medium', status:'Reviewed', detail:'Audio event already reviewed by supervisor.'},
];
export const users = [
  {id:1,name:'System Administrator',email:'admin@ukuri.test',role:'Administrator',status:'Active'},
  {id:2,name:'Aline Uwase',email:'aline@ukuri.test',role:'Supervisor',status:'Active'},
  {id:3,name:'Patrick Mugabo',email:'patrick@ukuri.test',role:'Supervisor',status:'Active'},
  {id:4,name:'Exam Coordinator',email:'coordinator@ukuri.test',role:'Coordinator',status:'Active'}
];
export const trend = [{time:'09:00',behavior:1,phone:0,sound:1},{time:'09:30',behavior:2,phone:1,sound:2},{time:'10:00',behavior:3,phone:1,sound:1},{time:'10:30',behavior:2,phone:3,sound:2},{time:'11:00',behavior:1,phone:2,sound:3},{time:'11:30',behavior:3,phone:2,sound:2}];
