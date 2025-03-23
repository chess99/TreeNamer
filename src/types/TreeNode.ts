export interface TreeNode {
  id: string;
  name: string;
  is_dir: boolean;
  children: TreeNode[];
  oldPath?: string;
  newPath?: string;
} 