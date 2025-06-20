import React from 'react';
import {
  Layout, Menu, Breadcrumb, Button, Icon, Table, Form, Input, Select, 
  DatePicker, TimePicker, Checkbox, Radio, Switch, Slider, Rate, 
  Upload, Progress, Spin, Alert, Modal, Drawer, Popover, Tooltip,
  Dropdown, Card, Collapse, Tabs, Steps, Tree, Transfer, Cascader,
  AutoComplete, Mention, Tag, Divider, Avatar, Badge, Comment,
  List, Skeleton, BackTop, Anchor, Affix, ConfigProvider, LocaleProvider
} from 'antd';
import { WrappedFormUtils } from 'antd/lib/form/Form';
import moment from 'moment';
import 'antd/dist/antd.css';

const { Header, Content, Footer, Sider } = Layout;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Step } = Steps;
const { TreeNode } = Tree;
const { Link } = Anchor;

// Complex form with v3 API
interface FormProps {
  form: WrappedFormUtils;
}

const AntdFormComponent: React.FC<FormProps> = ({ form }) => {
  const { getFieldDecorator, validateFields, resetFields } = form;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateFields((err, values) => {
      if (!err) {
        console.log('Received values:', values);
      }
    });
  };

  const handleReset = () => {
    resetFields();
  };

  return (
    <Form onSubmit={handleSubmit} className="login-form">
      <Form.Item label="Username">
        {getFieldDecorator('username', {
          rules: [{ required: true, message: 'Please input your username!' }],
        })(
          <Input 
            prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />}
            placeholder="Username" 
          />
        )}
      </Form.Item>

      <Form.Item label="Password">
        {getFieldDecorator('password', {
          rules: [{ required: true, message: 'Please input your password!' }],
        })(
          <Input.Password
            prefix={<Icon type="lock" style={{ color: 'rgba(0,0,0,.25)' }} />}
            placeholder="Password"
          />
        )}
      </Form.Item>

      <Form.Item label="Email">
        {getFieldDecorator('email', {
          rules: [
            { required: true, message: 'Please input your email!' },
            { type: 'email', message: 'Please enter a valid email!' },
          ],
        })(
          <Input 
            prefix={<Icon type="mail" style={{ color: 'rgba(0,0,0,.25)' }} />}
            placeholder="Email" 
          />
        )}
      </Form.Item>

      <Form.Item label="Phone">
        {getFieldDecorator('phone', {
          rules: [{ required: true, message: 'Please input your phone!' }],
        })(
          <Input 
            addonBefore={<Icon type="phone" />}
            placeholder="Phone Number" 
          />
        )}
      </Form.Item>

      <Form.Item label="Country">
        {getFieldDecorator('country', {
          initialValue: 'usa',
          rules: [{ required: true, message: 'Please select your country!' }],
        })(
          <Select placeholder="Select a country">
            <Option value="usa">
              <Icon type="flag" /> United States
            </Option>
            <Option value="canada">
              <Icon type="flag" /> Canada
            </Option>
            <Option value="uk">
              <Icon type="flag" /> United Kingdom
            </Option>
          </Select>
        )}
      </Form.Item>

      <Form.Item label="Birth Date">
        {getFieldDecorator('birthDate', {
          rules: [{ required: true, message: 'Please select your birth date!' }],
        })(
          <DatePicker style={{ width: '100%' }} />
        )}
      </Form.Item>

      <Form.Item label="Available Time">
        {getFieldDecorator('timeRange', {
          rules: [{ required: true, message: 'Please select time range!' }],
        })(
          <RangePicker showTime format="YYYY-MM-DD HH:mm:ss" />
        )}
      </Form.Item>

      <Form.Item label="Interests">
        {getFieldDecorator('interests', {
          valuePropName: 'checked',
          initialValue: false,
        })(
          <Checkbox.Group>
            <Checkbox value="tech">Technology</Checkbox>
            <Checkbox value="sports">Sports</Checkbox>
            <Checkbox value="music">Music</Checkbox>
            <Checkbox value="travel">Travel</Checkbox>
          </Checkbox.Group>
        )}
      </Form.Item>

      <Form.Item label="Gender">
        {getFieldDecorator('gender', {
          initialValue: 'male',
        })(
          <Radio.Group>
            <Radio value="male">Male</Radio>
            <Radio value="female">Female</Radio>
            <Radio value="other">Other</Radio>
          </Radio.Group>
        )}
      </Form.Item>

      <Form.Item label="Notifications">
        {getFieldDecorator('notifications', {
          valuePropName: 'checked',
          initialValue: true,
        })(
          <Switch />
        )}
      </Form.Item>

      <Form.Item label="Experience Level">
        {getFieldDecorator('experience', {
          initialValue: 3,
        })(
          <Slider min={1} max={5} marks={{ 1: 'Beginner', 5: 'Expert' }} />
        )}
      </Form.Item>

      <Form.Item label="Rating">
        {getFieldDecorator('rating', {
          initialValue: 4,
        })(
          <Rate />
        )}
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" className="login-form-button">
          <Icon type="login" />
          Submit
        </Button>
        <Button style={{ marginLeft: 8 }} onClick={handleReset}>
          <Icon type="reload" />
          Reset
        </Button>
      </Form.Item>
    </Form>
  );
};

const WrappedAntdForm = Form.create<FormProps>()(AntdFormComponent);

// Main App Component with complex Ant Design v3 usage
const ComplexAntdApp: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>(['1']);
  const [tableData, setTableData] = React.useState([
    {
      key: '1',
      name: 'John Brown',
      age: 32,
      address: 'New York No. 1 Lake Park',
      status: 'active',
    },
    {
      key: '2',
      name: 'Jim Green',
      age: 42,
      address: 'London No. 1 Lake Park',
      status: 'inactive',
    },
    {
      key: '3',
      name: 'Joe Black',
      age: 32,
      address: 'Sidney No. 1 Lake Park',
      status: 'pending',
    },
  ]);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <span>
          <Icon type="user" style={{ marginRight: 8 }} />
          {text}
        </span>
      ),
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
      sorter: (a: any, b: any) => a.age - b.age,
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = status === 'active' ? 'green' : status === 'inactive' ? 'red' : 'orange';
        let icon = status === 'active' ? 'check-circle' : status === 'inactive' ? 'close-circle' : 'clock-circle';
        return (
          <Tag color={color}>
            <Icon type={icon} style={{ marginRight: 4 }} />
            {status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (text: string, record: any) => (
        <span>
          <Button type="link" size="small">
            <Icon type="edit" />
            Edit
          </Button>
          <Divider type="vertical" />
          <Button type="link" size="small" danger>
            <Icon type="delete" />
            Delete
          </Button>
        </span>
      ),
    },
  ];

  const menuItems = [
    {
      key: '1',
      icon: 'home',
      title: 'Dashboard',
      path: '/dashboard',
    },
    {
      key: '2',
      icon: 'user',
      title: 'Users',
      path: '/users',
      children: [
        { key: '2-1', title: 'User List', path: '/users/list' },
        { key: '2-2', title: 'User Profile', path: '/users/profile' },
      ],
    },
    {
      key: '3',
      icon: 'setting',
      title: 'Settings',
      path: '/settings',
      children: [
        { key: '3-1', title: 'System Settings', path: '/settings/system' },
        { key: '3-2', title: 'User Preferences', path: '/settings/user' },
      ],
    },
    {
      key: '4',
      icon: 'bar-chart',
      title: 'Analytics',
      path: '/analytics',
    },
    {
      key: '5',
      icon: 'file-text',
      title: 'Reports',
      path: '/reports',
    },
  ];

  const renderMenu = (items: any[]) => (
    <Menu
      theme="dark"
      mode="inline"
      defaultSelectedKeys={['1']}
      selectedKeys={selectedKeys}
      onSelect={({ selectedKeys }) => setSelectedKeys(selectedKeys)}
    >
      {items.map((item) => {
        if (item.children) {
          return (
            <Menu.SubMenu
              key={item.key}
              title={
                <span>
                  <Icon type={item.icon} />
                  <span>{item.title}</span>
                </span>
              }
            >
              {item.children.map((child: any) => (
                <Menu.Item key={child.key}>
                  <span>{child.title}</span>
                </Menu.Item>
              ))}
            </Menu.SubMenu>
          );
        }
        return (
          <Menu.Item key={item.key}>
            <Icon type={item.icon} />
            <span>{item.title}</span>
          </Menu.Item>
        );
      })}
    </Menu>
  );

  const handleUpload = {
    name: 'file',
    multiple: true,
    action: 'https://www.mocky.io/v2/5cc8019d300000980a055e76',
    onChange(info: any) {
      const { status } = info.file;
      if (status !== 'uploading') {
        console.log(info.file, info.fileList);
      }
      if (status === 'done') {
        Modal.success({
          title: 'Upload Successful',
          content: `${info.file.name} file uploaded successfully.`,
        });
      } else if (status === 'error') {
        Modal.error({
          title: 'Upload Failed',
          content: `${info.file.name} file upload failed.`,
        });
      }
    },
  };

  const treeData = [
    {
      title: 'Documents',
      key: '0-0',
      icon: <Icon type="folder" />,
      children: [
        {
          title: 'Projects',
          key: '0-0-0',
          icon: <Icon type="folder" />,
          children: [
            { title: 'Project A', key: '0-0-0-0', icon: <Icon type="file" /> },
            { title: 'Project B', key: '0-0-0-1', icon: <Icon type="file" /> },
          ],
        },
        {
          title: 'Reports',
          key: '0-0-1',
          icon: <Icon type="folder" />,
          children: [
            { title: 'Q1 Report', key: '0-0-1-0', icon: <Icon type="file-text" /> },
            { title: 'Q2 Report', key: '0-0-1-1', icon: <Icon type="file-text" /> },
          ],
        },
      ],
    },
    {
      title: 'Images',
      key: '0-1',
      icon: <Icon type="folder" />,
      children: [
        { title: 'Photo 1', key: '0-1-0', icon: <Icon type="picture" /> },
        { title: 'Photo 2', key: '0-1-1', icon: <Icon type="picture" /> },
      ],
    },
  ];

  const dropdownMenu = (
    <Menu>
      <Menu.Item key="1">
        <Icon type="user" />
        Profile
      </Menu.Item>
      <Menu.Item key="2">
        <Icon type="setting" />
        Settings
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="3">
        <Icon type="logout" />
        Logout
      </Menu.Item>
    </Menu>
  );

  const comments = [
    {
      author: 'Han Solo',
      avatar: 'https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png',
      content: (
        <p>
          We supply a series of design principles, practical patterns and high quality design
          resources (Sketch and Axure), to help people create their product prototypes beautifully
          and efficiently.
        </p>
      ),
      datetime: moment().subtract(1, 'days').fromNow(),
    },
    {
      author: 'Leia Organa',
      avatar: 'https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png',
      content: (
        <p>
          Ant Design is a design language for background applications. It is refined by Ant UED Team.
          This is a nest comment.
        </p>
      ),
      datetime: moment().subtract(2, 'days').fromNow(),
    },
  ];

  return (
    <LocaleProvider locale={require('antd/lib/locale-provider/en_US')}>
      <ConfigProvider>
        <Layout style={{ minHeight: '100vh' }}>
          <Sider 
            collapsible 
            collapsed={collapsed} 
            onCollapse={(collapsed) => setCollapsed(collapsed)}
            style={{ background: '#001529' }}
          >
            <div className="logo" style={{ 
              height: 32, 
              background: 'rgba(255,255,255,.2)', 
              margin: 16, 
              textAlign: 'center',
              lineHeight: '32px',
              color: 'white',
              fontSize: 16,
              fontWeight: 'bold'
            }}>
              <Icon type="ant-design" style={{ marginRight: 8 }} />
              {!collapsed && 'Ant Design'}
            </div>
            {renderMenu(menuItems)}
          </Sider>

          <Layout>
            <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Breadcrumb style={{ margin: '16px 0' }}>
                <Breadcrumb.Item>
                  <Icon type="home" />
                </Breadcrumb.Item>
                <Breadcrumb.Item>
                  <Icon type="user" />
                  <span>Application List</span>
                </Breadcrumb.Item>
                <Breadcrumb.Item>
                  <Icon type="appstore" />
                  An Application
                </Breadcrumb.Item>
              </Breadcrumb>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Tooltip title="Search">
                  <Button type="primary" shape="circle" icon="search" style={{ marginRight: 8 }} />
                </Tooltip>
                <Tooltip title="Notifications">
                  <Badge count={5} offset={[-10, 10]}>
                    <Button type="primary" shape="circle" icon="bell" style={{ marginRight: 8 }} />
                  </Badge>
                </Tooltip>
                <Dropdown overlay={dropdownMenu} placement="bottomRight">
                  <Button type="primary" style={{ marginRight: 8 }}>
                    <Icon type="user" />
                    John Doe
                    <Icon type="down" />
                  </Button>
                </Dropdown>
              </div>
            </Header>

            <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
              {/* Alert Messages */}
              <div style={{ marginBottom: 24 }}>
                <Alert
                  message="System Notification"
                  description="This is a complex Ant Design v3 application that demonstrates various components with icon usage."
                  type="info"
                  showIcon
                  icon={<Icon type="info-circle" />}
                  closable
                  style={{ marginBottom: 16 }}
                />
                <Alert
                  message="Warning"
                  description="Some features may not work correctly after migration to v4."
                  type="warning"
                  showIcon
                  icon={<Icon type="warning" />}
                  closable
                />
              </div>

              {/* Statistics Cards */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                <Card style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Icon type="user" style={{ fontSize: 24, color: '#1890ff', marginRight: 16 }} />
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 'bold' }}>2,543</div>
                      <div style={{ color: '#666' }}>Total Users</div>
                    </div>
                  </div>
                </Card>
                <Card style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Icon type="shopping-cart" style={{ fontSize: 24, color: '#52c41a', marginRight: 16 }} />
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 'bold' }}>1,234</div>
                      <div style={{ color: '#666' }}>Orders</div>
                    </div>
                  </div>
                </Card>
                <Card style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Icon type="dollar-circle" style={{ fontSize: 24, color: '#faad14', marginRight: 16 }} />
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 'bold' }}>$45,678</div>
                      <div style={{ color: '#666' }}>Revenue</div>
                    </div>
                  </div>
                </Card>
                <Card style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Icon type="line-chart" style={{ fontSize: 24, color: '#f5222d', marginRight: 16 }} />
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 'bold' }}>89.3%</div>
                      <div style={{ color: '#666' }}>Growth</div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Tabs with different content */}
              <Tabs defaultActiveKey="1" style={{ marginBottom: 24 }}>
                <TabPane 
                  tab={
                    <span>
                      <Icon type="table" />
                      Data Table
                    </span>
                  } 
                  key="1"
                >
                  <Table 
                    columns={columns} 
                    dataSource={tableData} 
                    loading={loading}
                    pagination={{ pageSize: 5 }}
                    scroll={{ x: 800 }}
                  />
                </TabPane>
                <TabPane 
                  tab={
                    <span>
                      <Icon type="form" />
                      User Form
                    </span>
                  } 
                  key="2"
                >
                  <WrappedAntdForm />
                </TabPane>
                <TabPane 
                  tab={
                    <span>
                      <Icon type="upload" />
                      File Upload
                    </span>
                  } 
                  key="3"
                >
                  <Upload.Dragger {...handleUpload}>
                    <p className="ant-upload-drag-icon">
                      <Icon type="inbox" />
                    </p>
                    <p className="ant-upload-text">Click or drag file to this area to upload</p>
                    <p className="ant-upload-hint">
                      Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files
                    </p>
                  </Upload.Dragger>
                </TabPane>
              </Tabs>

              {/* Collapse Panels */}
              <Collapse defaultActiveKey={['1']} style={{ marginBottom: 24 }}>
                <Panel 
                  header={
                    <span>
                      <Icon type="pie-chart" />
                      Analytics Dashboard
                    </span>
                  } 
                  key="1"
                >
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <Progress type="circle" percent={75} />
                      <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <Icon type="check-circle" style={{ color: '#52c41a', marginRight: 4 }} />
                        Completion Rate
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Progress type="circle" percent={85} status="active" />
                      <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <Icon type="clock-circle" style={{ color: '#1890ff', marginRight: 4 }} />
                        Active Tasks
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <Progress type="circle" percent={65} status="exception" />
                      <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <Icon type="exclamation-circle" style={{ color: '#f5222d', marginRight: 4 }} />
                        Error Rate
                      </div>
                    </div>
                  </div>
                </Panel>
                <Panel 
                  header={
                    <span>
                      <Icon type="folder-open" />
                      File Browser
                    </span>
                  } 
                  key="2"
                >
                  <Tree
                    showIcon
                    defaultExpandedKeys={['0-0-0', '0-0-1']}
                    defaultSelectedKeys={['0-0-0', '0-0-1']}
                    treeData={treeData}
                  />
                </Panel>
              </Collapse>

              {/* Steps Component */}
              <Steps current={1} style={{ marginBottom: 24 }}>
                <Step 
                  title="Finished" 
                  description="Setup project structure." 
                  icon={<Icon type="check-circle" />}
                />
                <Step 
                  title="In Progress" 
                  description="Implementing features." 
                  icon={<Icon type="loading" />}
                />
                <Step 
                  title="Waiting" 
                  description="Testing and deployment."
                  icon={<Icon type="clock-circle" />}
                />
              </Steps>

              {/* Comments Section */}
              <div style={{ marginBottom: 24 }}>
                <h3>
                  <Icon type="message" style={{ marginRight: 8 }} />
                  Recent Comments
                </h3>
                <List
                  itemLayout="horizontal"
                  dataSource={comments}
                  renderItem={(item) => (
                    <li>
                      <Comment
                        author={item.author}
                        avatar={<Avatar src={item.avatar} />}
                        content={item.content}
                        datetime={item.datetime}
                        actions={[
                          <span key="like">
                            <Icon type="like" />
                            <span style={{ marginLeft: 8 }}>Like</span>
                          </span>,
                          <span key="dislike">
                            <Icon type="dislike" />
                            <span style={{ marginLeft: 8 }}>Dislike</span>
                          </span>,
                          <span key="reply">
                            <Icon type="message" />
                            <span style={{ marginLeft: 8 }}>Reply</span>
                          </span>,
                        ]}
                      />
                    </li>
                  )}
                />
              </div>

              {/* Anchor Navigation */}
              <Anchor style={{ marginBottom: 24 }}>
                <Link href="#components" title="Components">
                  <Link href="#general" title="General">
                    <Link href="#button" title="Button" />
                    <Link href="#icon" title="Icon" />
                  </Link>
                  <Link href="#layout" title="Layout">
                    <Link href="#grid" title="Grid" />
                    <Link href="#layout" title="Layout" />
                  </Link>
                  <Link href="#navigation" title="Navigation">
                    <Link href="#affix" title="Affix" />
                    <Link href="#breadcrumb" title="Breadcrumb" />
                    <Link href="#dropdown" title="Dropdown" />
                    <Link href="#menu" title="Menu" />
                    <Link href="#pagination" title="Pagination" />
                    <Link href="#steps" title="Steps" />
                  </Link>
                </Link>
              </Anchor>
            </Content>

            <Footer style={{ textAlign: 'center' }}>
              <div>
                <Icon type="copyright" style={{ marginRight: 8 }} />
                Ant Design ©2018 Created by Ant UED
              </div>
              <div style={{ marginTop: 8 }}>
                <Button type="link" size="small">
                  <Icon type="github" />
                  GitHub
                </Button>
                <Button type="link" size="small">
                  <Icon type="twitter" />
                  Twitter
                </Button>
                <Button type="link" size="small">
                  <Icon type="facebook" />
                  Facebook
                </Button>
              </div>
            </Footer>
          </Layout>

          {/* Back to Top */}
          <BackTop>
            <div style={{
              height: 40,
              width: 40,
              lineHeight: '40px',
              borderRadius: 4,
              backgroundColor: '#1088e9',
              color: '#fff',
              textAlign: 'center',
              fontSize: 14,
            }}>
              <Icon type="up" />
            </div>
          </BackTop>

          {/* Fixed Position Elements */}
          <Affix offsetTop={10}>
            <Button type="primary" onClick={() => setLoading(!loading)}>
              <Icon type={loading ? 'loading' : 'sync'} />
              {loading ? 'Loading...' : 'Refresh Data'}
            </Button>
          </Affix>
        </Layout>
      </ConfigProvider>
    </LocaleProvider>
  );
};

export default ComplexAntdApp;