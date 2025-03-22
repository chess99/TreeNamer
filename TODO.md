- [ ] 疑问: 重命名时, 每个文件和文件夹实例应该是一一对应的, 为什么需要做相似度的检测. 我理解预览的目录文件树上的每一个节点都对应一个文件或文件夹的实体, 所以每个节点应该都是唯一的, 不应该存在相似度的问题. 重要的是处理应用新命名时的冲突等问题. 我的理解对吗? 你也可以给我讲讲目前你实现的逻辑是什么样的. 我们对齐一下, 然后更新文档/测试代码等把可能混淆的点都进行澄清, 避免后人理解错误.

- [ ] 之前写那些测试只是一次性的手动执行的代码吧? 能固化下来作为单测吗? tauri项目的单测规范通常应该是什么样的.

- [ ] UI还是没弹出来, 点击 "Browse" 按钮后, 我F12查看控制台发现以下报错
index-Dg1OnEbB.js:799
 Failed to open directory: dialog.open not allowed. Permissions associated with this command: dialog:allow-open, dialog:default
b @ index-Dg1OnEbB.js:799
await in b  
ue @ index-Dg1OnEbB.js:38
ri @ index-Dg1OnEbB.js:38
Ki @ index-Dg1OnEbB.js:38
az @ index-Dg1OnEbB.js:38
lz @ index-Dg1OnEbB.js:38
(anonymous) @ index-Dg1OnEbB.js:38
RP @ index-Dg1OnEbB.js:41
H @ index-Dg1OnEbB.js:38
R2 @ index-Dg1OnEbB.js:38
g2 @ index-Dg1OnEbB.js:38
Soe @ index-Dg1OnEbB.js:38

- [ ] 整理docs, 整理内容, 拆分为项目长期文档和临时性的进度追踪文档, 长期文档按内容进行合理排序. 临时文档用于每次迭代时更新.
