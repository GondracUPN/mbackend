import { RoleName } from '../../../common/enums/role-name.enum';

export interface AuthenticatedUser {
  id: string;
  companyId: string;
  branchId: string | null;
  fullName: string;
  email: string;
  roles: RoleName[];
}
