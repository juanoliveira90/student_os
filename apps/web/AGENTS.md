# Guidance
- Your goal is to write code not only to work, but so other people can understand it.
- Avoid nested ternary operators

bad:
~~~
function ItemList({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          {item.status === 'active' ? (
            <div className="active-item">
              {item.name}
            </div>
          ) : item.status === 'inactive' ? (
            <div className="inactive-item">
              {item.name} (inactive)
            </div>
          ) : (
            <div className="pending-item">
              {item.name} (pending)
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
~~~

good:
~~~
function ItemList({ items }) {
  const statusStyles = {
    active: 'active-item',
    inactive: 'inactive-item',
    pending: 'pending-item',
  };

  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          <div className={statusStyles[item.status]}>
            {item.name}
          </div>
        </li>
      ))}
    </ul>
  );
}
~~~